using System;
using System.ComponentModel;
using System.Windows;
using System.Windows.Forms;
using AirCursorDesktop.Core;

namespace AirCursorDesktop
{
    public partial class MainWindow : Window
    {
        private readonly IMouseController _mouseController;
        private readonly MotionProcessor _motionProcessor;
        private DesktopWebSocketClient? _wsClient;
        private NotifyIcon? _notifyIcon;

        public MainWindow() : this(new WindowsMouseController())
        {
        }

        public MainWindow(IMouseController mouseController)
        {
            InitializeComponent();
            _mouseController = mouseController ?? throw new ArgumentNullException(nameof(mouseController));
            _motionProcessor = new MotionProcessor(_mouseController);

            SetupSystemTray();
            InitializeWebSocketClient(TxtServerUrl.Text);
        }

        private void InitializeWebSocketClient(string serverUrl)
        {
            if (_wsClient != null)
            {
                _ = _wsClient.StopAsync();
            }

            _wsClient = new DesktopWebSocketClient(serverUrl, _motionProcessor);
            _wsClient.OnSessionCreated += (code) =>
            {
                Dispatcher.Invoke(() =>
                {
                    TxtPairCode.Text = code;
                });
            };

            _wsClient.OnStatusChanged += (statusText) =>
            {
                Dispatcher.Invoke(() =>
                {
                    TxtStatus.Text = statusText;
                    if (_notifyIcon != null)
                    {
                        _notifyIcon.Text = $"AirCursor: {statusText}".Substring(0, Math.Min(63, statusText.Length + 10));
                    }
                });
            };

            _wsClient.OnControllerConnected += () =>
            {
                Dispatcher.Invoke(() =>
                {
                    BtnResume.Visibility = Visibility.Collapsed;
                    BtnEmergencyStop.IsEnabled = true;
                });
            };

            _wsClient.OnControllerDisconnected += () =>
            {
                Dispatcher.Invoke(() =>
                {
                    BtnResume.Visibility = Visibility.Collapsed;
                });
            };

            _wsClient.OnError += (err) =>
            {
                Dispatcher.Invoke(() =>
                {
                    TxtStatus.Text = err;
                });
            };

            _ = _wsClient.StartAsync();
        }

        private void SetupSystemTray()
        {
            try
            {
                _notifyIcon = new NotifyIcon
                {
                    Icon = System.Drawing.SystemIcons.Application,
                    Visible = true,
                    Text = "AirCursor Desktop"
                };

                var contextMenu = new ContextMenuStrip();
                contextMenu.Items.Add("Open AirCursor", null, (s, e) => ShowWindow());
                contextMenu.Items.Add("Emergency Stop", null, (s, e) => BtnEmergencyStop_Click(s ?? this, new RoutedEventArgs()));
                contextMenu.Items.Add("-");
                contextMenu.Items.Add("Exit", null, (s, e) => ExitApplication());

                _notifyIcon.ContextMenuStrip = contextMenu;
                _notifyIcon.DoubleClick += (s, e) => ShowWindow();
            }
            catch
            {
                // Ignore tray icon errors if not supported
            }
        }

        private void ShowWindow()
        {
            Show();
            WindowState = WindowState.Normal;
            Activate();
        }

        protected override void OnStateChanged(EventArgs e)
        {
            if (WindowState == WindowState.Minimized)
            {
                Hide();
            }
            base.OnStateChanged(e);
        }

        protected override void OnClosing(CancelEventArgs e)
        {
            _motionProcessor.TriggerEmergencyStop();
            _ = _wsClient?.StopAsync();
            _notifyIcon?.Dispose();
            base.OnClosing(e);
        }

        private void ExitApplication()
        {
            _motionProcessor.TriggerEmergencyStop();
            _notifyIcon?.Dispose();
            System.Windows.Application.Current.Shutdown();
        }

        private void SliderSensitivity_ValueChanged(object sender, RoutedPropertyChangedEventArgs<double> e)
        {
            if (TxtSensitivityVal != null && _motionProcessor != null)
            {
                _motionProcessor.Sensitivity = e.NewValue;
                TxtSensitivityVal.Text = $"{e.NewValue:0.0}x";
            }
        }

        private void BtnCalibrate_Click(object sender, RoutedEventArgs e)
        {
            System.Windows.MessageBox.Show(
                "Hold your phone in a comfortable neutral position and tap 'CALIBRATE' on your mobile controller.",
                "AirCursor Calibration",
                MessageBoxButton.OK,
                MessageBoxImage.Information
            );
        }

        private void BtnEmergencyStop_Click(object sender, RoutedEventArgs e)
        {
            _motionProcessor.TriggerEmergencyStop();
            TxtStatus.Text = "🛑 Emergency Stop Activated — Mouse Control Halted";
            BtnResume.Visibility = Visibility.Visible;
            BtnEmergencyStop.IsEnabled = false;
        }

        private void BtnResume_Click(object sender, RoutedEventArgs e)
        {
            _motionProcessor.Resume();
            TxtStatus.Text = "Mouse control resumed.";
            BtnResume.Visibility = Visibility.Collapsed;
            BtnEmergencyStop.IsEnabled = true;
        }

        private void BtnReconnect_Click(object sender, RoutedEventArgs e)
        {
            InitializeWebSocketClient(TxtServerUrl.Text.Trim());
        }
    }
}
