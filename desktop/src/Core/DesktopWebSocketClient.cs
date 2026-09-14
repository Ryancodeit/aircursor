using System;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace AirCursorDesktop.Core
{
    public class DesktopWebSocketClient
    {
        private ClientWebSocket? _client;
        private CancellationTokenSource? _cts;
        private readonly string _serverUrl;
        private readonly MotionProcessor _motionProcessor;

        public event Action<string>? OnSessionCreated;
        public event Action? OnControllerConnected;
        public event Action? OnControllerDisconnected;
        public event Action<string>? OnStatusChanged;
        public event Action<string>? OnError;

        public string? SessionId { get; private set; }
        public string? PairingCode { get; private set; }
        public bool IsConnected => _client != null && _client.State == WebSocketState.Open;

        public DesktopWebSocketClient(string serverUrl, MotionProcessor motionProcessor)
        {
            _serverUrl = string.IsNullOrWhiteSpace(serverUrl) ? "wss://aircursor.onrender.com" : serverUrl;
            _motionProcessor = motionProcessor ?? throw new ArgumentNullException(nameof(motionProcessor));
        }

        public Task StartAsync()
        {
            _cts = new CancellationTokenSource();
            _ = Task.Run(() => ConnectionLoopAsync(_cts.Token));
            return Task.CompletedTask;
        }

        private async Task ConnectionLoopAsync(CancellationToken token)
        {
            int reconnectAttempts = 0;

            while (!token.IsCancellationRequested)
            {
                try
                {
                    OnStatusChanged?.Invoke("Connecting to AirCursor server...");
                    _client = new ClientWebSocket();
                    Uri serverUri = new Uri(_serverUrl);

                    await _client.ConnectAsync(serverUri, token);
                    reconnectAttempts = 0;
                    OnStatusChanged?.Invoke("Connected to server. Creating session...");

                    // Send create_session message with deviceType: desktop
                    var createMsg = new { type = "create_session", deviceType = "desktop" };
                    string json = JsonSerializer.Serialize(createMsg);
                    byte[] bytes = Encoding.UTF8.GetBytes(json);
                    await _client.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, token);

                    // Start background receive loop
                    await ReceiveLoopAsync(token);
                }
                catch (Exception ex)
                {
                    _motionProcessor.HandleDisconnect();
                    OnError?.Invoke($"Connection error: {ex.Message}");
                    OnStatusChanged?.Invoke("Disconnected. Reconnecting...");
                }

                if (token.IsCancellationRequested) break;

                reconnectAttempts++;
                int backoffMs = Math.Min(1000 * (int)Math.Pow(2, reconnectAttempts - 1), 16000);
                await Task.Delay(backoffMs, token);
            }
        }

        private async Task ReceiveLoopAsync(CancellationToken token)
        {
            var buffer = new byte[4096];

            while (_client != null && _client.State == WebSocketState.Open && !token.IsCancellationRequested)
            {
                var result = await _client.ReceiveAsync(new ArraySegment<byte>(buffer), token);

                if (result.MessageType == WebSocketMessageType.Close)
                {
                    _motionProcessor.HandleDisconnect();
                    OnStatusChanged?.Invoke("Connection closed by server.");
                    break;
                }

                if (result.MessageType == WebSocketMessageType.Text)
                {
                    string jsonStr = Encoding.UTF8.GetString(buffer, 0, result.Count);
                    ProcessIncomingMessage(jsonStr);
                }
            }
        }

        private void ProcessIncomingMessage(string jsonStr)
        {
            try
            {
                using var doc = JsonDocument.Parse(jsonStr);
                var root = doc.RootElement;
                if (!root.TryGetProperty("type", out var typeProp)) return;

                string messageType = typeProp.GetString() ?? "";

                switch (messageType)
                {
                    case "session_created":
                        SessionId = root.GetProperty("sessionId").GetString();
                        PairingCode = root.GetProperty("pairingCode").GetString();
                        OnStatusChanged?.Invoke($"Waiting for phone controller (Code: {PairingCode})");
                        if (PairingCode != null) OnSessionCreated?.Invoke(PairingCode);
                        break;

                    case "controller_connected":
                        _motionProcessor.Resume();
                        OnStatusChanged?.Invoke("Phone Connected — Mouse Control Active");
                        OnControllerConnected?.Invoke();
                        break;

                    case "controller_disconnected":
                        _motionProcessor.HandleDisconnect();
                        OnStatusChanged?.Invoke("Phone Disconnected — Mouse Control Stopped");
                        OnControllerDisconnected?.Invoke();
                        break;

                    case "motion":
                        double dx = root.GetProperty("dx").GetDouble();
                        double dy = root.GetProperty("dy").GetDouble();
                        _motionProcessor.ProcessMotion(dx, dy);
                        break;

                    case "click":
                    case "right_click":
                    case "double_click":
                    case "mouse_down":
                    case "mouse_up":
                    case "drag_start":
                    case "drag_end":
                    case "calibrate":
                    case "emergency_stop":
                        string? button = root.TryGetProperty("button", out var b) ? b.GetString() : null;
                        int? scrollDy = root.TryGetProperty("dy", out var s) ? s.GetInt32() : null;
                        _motionProcessor.ProcessAction(messageType, button, scrollDy);
                        break;

                    case "scroll":
                        int dyVal = root.GetProperty("dy").GetInt32();
                        _motionProcessor.ProcessAction("scroll", null, dyVal);
                        break;

                    case "media_command":
                        string? cmd = root.TryGetProperty("command", out var cProp) ? cProp.GetString() : null;
                        if (cmd != null) _motionProcessor.ProcessMediaCommand(cmd);
                        break;

                    case "keyboard_input":
                        string? k = root.TryGetProperty("key", out var kProp) ? kProp.GetString() : null;
                        if (k != null) _motionProcessor.ProcessKeyboardInput(k);
                        break;
                }

            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WS Error]: {ex.Message}");
            }
        }

        public async Task StopAsync()
        {
            _motionProcessor.HandleDisconnect();
            if (_cts != null)
            {
                _cts.Cancel();
            }
            if (_client != null && _client.State == WebSocketState.Open)
            {
                try
                {
                    await _client.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None);
                }
                catch {}
            }
            _client?.Dispose();
        }
    }
}
