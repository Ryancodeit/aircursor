using System;
using System.Runtime.InteropServices;

namespace AirCursorDesktop.Core
{
    public class WindowsMouseController : IMouseController
    {
        [DllImport("user32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool GetCursorPos(out POINT lpPoint);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool SetCursorPos(int X, int Y);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

        [DllImport("user32.dll")]
        private static extern int GetSystemMetrics(int nIndex);

        private const int INPUT_MOUSE = 0;

        private const int SM_XVIRTUALSCREEN = 76;
        private const int SM_YVIRTUALSCREEN = 77;
        private const int SM_CXVIRTUALSCREEN = 78;
        private const int SM_CYVIRTUALSCREEN = 79;

        private const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
        private const uint MOUSEEVENTF_LEFTUP = 0x0004;
        private const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
        private const uint MOUSEEVENTF_RIGHTUP = 0x0010;
        private const uint MOUSEEVENTF_MIDDLEDOWN = 0x0020;
        private const uint MOUSEEVENTF_MIDDLEUP = 0x0040;
        private const uint MOUSEEVENTF_WHEEL = 0x0800;

        [StructLayout(LayoutKind.Sequential)]
        public struct POINT
        {
            public int X;
            public int Y;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct MOUSEINPUT
        {
            public int dx;
            public int dy;
            public uint mouseData;
            public uint dwFlags;
            public uint time;
            public IntPtr dwExtraInfo;
        }

        [StructLayout(LayoutKind.Explicit)]
        private struct INPUT
        {
            [FieldOffset(0)]
            public uint type;
            [FieldOffset(8)]
            public MOUSEINPUT mi;
        }

        public bool IsLeftHeld { get; private set; }
        public bool IsRightHeld { get; private set; }

        private static void SendMouseInput(uint dwFlags, uint mouseData = 0)
        {
            INPUT[] inputs = new INPUT[1];
            inputs[0].type = INPUT_MOUSE;
            inputs[0].mi = new MOUSEINPUT
            {
                dx = 0,
                dy = 0,
                mouseData = mouseData,
                dwFlags = dwFlags,
                time = 0,
                dwExtraInfo = IntPtr.Zero
            };

            SendInput(1, inputs, Marshal.SizeOf(typeof(INPUT)));
        }

        public void Move(int dx, int dy)
        {
            // Safety clamp max delta per update
            dx = Math.Clamp(dx, -150, 150);
            dy = Math.Clamp(dy, -150, 150);

            if (GetCursorPos(out POINT current))
            {
                int virtualX = GetSystemMetrics(SM_XVIRTUALSCREEN);
                int virtualY = GetSystemMetrics(SM_YVIRTUALSCREEN);
                int virtualWidth = GetSystemMetrics(SM_CXVIRTUALSCREEN);
                int virtualHeight = GetSystemMetrics(SM_CYVIRTUALSCREEN);

                if (virtualWidth <= 0) virtualWidth = 1920;
                if (virtualHeight <= 0) virtualHeight = 1080;

                int targetX = Math.Clamp(current.X + dx, virtualX, virtualX + virtualWidth - 1);
                int targetY = Math.Clamp(current.Y + dy, virtualY, virtualY + virtualHeight - 1);

                SetCursorPos(targetX, targetY);
            }
        }

        public void LeftDown()
        {
            if (!IsLeftHeld)
            {
                SendMouseInput(MOUSEEVENTF_LEFTDOWN);
                IsLeftHeld = true;
            }
        }

        public void LeftUp()
        {
            if (IsLeftHeld)
            {
                SendMouseInput(MOUSEEVENTF_LEFTUP);
                IsLeftHeld = false;
            }
        }

        public void ClickLeft()
        {
            LeftDown();
            LeftUp();
        }

        public void RightDown()
        {
            if (!IsRightHeld)
            {
                SendMouseInput(MOUSEEVENTF_RIGHTDOWN);
                IsRightHeld = true;
            }
        }

        public void RightUp()
        {
            if (IsRightHeld)
            {
                SendMouseInput(MOUSEEVENTF_RIGHTUP);
                IsRightHeld = false;
            }
        }

        public void ClickRight()
        {
            RightDown();
            RightUp();
        }

        public void MiddleDown()
        {
            SendMouseInput(MOUSEEVENTF_MIDDLEDOWN);
        }

        public void MiddleUp()
        {
            SendMouseInput(MOUSEEVENTF_MIDDLEUP);
        }

        public void Scroll(int deltaY)
        {
            int clamped = Math.Clamp(deltaY, -500, 500);
            // Windows WHEEL_DELTA is 120
            uint dwData = (uint)(clamped * 3);
            SendMouseInput(MOUSEEVENTF_WHEEL, dwData);
        }

        [DllImport("user32.dll")]
        private static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

        private const uint KEYEVENTF_KEYUP = 0x0002;

        private const byte VK_MEDIA_NEXT_TRACK = 0xB0;
        private const byte VK_MEDIA_PREV_TRACK = 0xB1;
        private const byte VK_MEDIA_STOP = 0xB2;
        private const byte VK_MEDIA_PLAY_PAUSE = 0xB3;
        private const byte VK_VOLUME_MUTE = 0xAD;
        private const byte VK_VOLUME_DOWN = 0xAE;
        private const byte VK_VOLUME_UP = 0xAF;
        private const byte VK_LEFT = 0x25;
        private const byte VK_RIGHT = 0x27;
        private const byte VK_F11 = 0x7A;

        private static void SendVirtualKey(byte vk)
        {
            keybd_event(vk, 0, 0, UIntPtr.Zero);
            keybd_event(vk, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        }

        public void ExecuteMediaCommand(string command)
        {
            try
            {
                switch (command.ToLowerInvariant())
                {
                    case "play_pause":
                        SendVirtualKey(VK_MEDIA_PLAY_PAUSE);
                        break;
                    case "next":
                        SendVirtualKey(VK_MEDIA_NEXT_TRACK);
                        break;
                    case "previous":
                        SendVirtualKey(VK_MEDIA_PREV_TRACK);
                        break;
                    case "volume_up":
                        SendVirtualKey(VK_VOLUME_UP);
                        break;
                    case "volume_down":
                        SendVirtualKey(VK_VOLUME_DOWN);
                        break;
                    case "mute":
                        SendVirtualKey(VK_VOLUME_MUTE);
                        break;
                    case "seek_backward":
                        SendVirtualKey(VK_LEFT);
                        break;
                    case "seek_forward":
                        SendVirtualKey(VK_RIGHT);
                        break;
                    case "stop":
                        SendVirtualKey(VK_MEDIA_STOP);
                        break;
                    case "fullscreen":
                        SendVirtualKey(VK_F11);
                        break;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WindowsMouseController] Media command error: {ex.Message}");
            }
        }

        public void ExecuteKeyboardInput(string key, string[]? modifiers = null)
        {
            try
            {
                if (string.IsNullOrEmpty(key)) return;

                byte vk = 0;
                bool needsShift = false;
                string upperKey = key.ToUpperInvariant();

                switch (upperKey)
                {
                    case "ENTER": case "RETURN": vk = 0x0D; break;
                    case "BACKSPACE": case "BACK": vk = 0x08; break;
                    case "SPACE": vk = 0x20; break;
                    case "TAB": vk = 0x09; break;
                    case "ESC": case "ESCAPE": vk = 0x1B; break;
                    case "CTRL": case "CONTROL": vk = 0x11; break;
                    case "ALT": vk = 0x12; break;
                    case "WIN": case "SUPER": vk = 0x5B; break;
                    case "LEFT": case "ARROWLEFT": vk = 0x25; break;
                    case "UP": case "ARROWUP": vk = 0x26; break;
                    case "RIGHT": case "ARROWRIGHT": vk = 0x27; break;
                    case "DOWN": case "ARROWDOWN": vk = 0x28; break;
                    case ".": vk = 0xBE; break; // VK_OEM_PERIOD
                    case ",": vk = 0xBC; break; // VK_OEM_COMMA
                    case "-": vk = 0xBD; break; // VK_OEM_MINUS
                    case "/": vk = 0xBF; break; // VK_OEM_2
                    case ";": vk = 0xBA; break; // VK_OEM_1
                    case ":": vk = 0xBA; needsShift = true; break;
                    case "?": vk = 0xBF; needsShift = true; break;
                    case "!": vk = 0x31; needsShift = true; break;
                    case "@": vk = 0x32; needsShift = true; break;
                    case "#": vk = 0x33; needsShift = true; break;
                    case "$": vk = 0x34; needsShift = true; break;
                    case "%": vk = 0x35; needsShift = true; break;
                    case "^": vk = 0x36; needsShift = true; break;
                    case "&": vk = 0x37; needsShift = true; break;
                    case "*": vk = 0x38; needsShift = true; break;
                    case "(": vk = 0x39; needsShift = true; break;
                    case ")": vk = 0x30; needsShift = true; break;
                    case "\"": vk = 0xDE; needsShift = true; break;
                    case "'": vk = 0xDE; break;
                    default:
                        if (key.Length == 1)
                        {
                            char ch = key[0];
                            if (ch >= 'a' && ch <= 'z')
                            {
                                vk = (byte)char.ToUpper(ch);
                            }
                            else if (ch >= 'A' && ch <= 'Z')
                            {
                                vk = (byte)ch;
                                needsShift = true;
                            }
                            else if (ch >= '0' && ch <= '9')
                            {
                                vk = (byte)ch;
                            }
                        }
                        break;
                }

                if (vk == 0) return;

                bool hasCtrl = modifiers != null && Array.Exists(modifiers, m => m.Equals("ctrl", StringComparison.OrdinalIgnoreCase));
                bool hasAlt = modifiers != null && Array.Exists(modifiers, m => m.Equals("alt", StringComparison.OrdinalIgnoreCase));
                bool hasShift = needsShift || (modifiers != null && Array.Exists(modifiers, m => m.Equals("shift", StringComparison.OrdinalIgnoreCase)));

                if (hasCtrl) keybd_event(0x11, 0, 0, UIntPtr.Zero);
                if (hasAlt) keybd_event(0x12, 0, 0, UIntPtr.Zero);
                if (hasShift) keybd_event(0x10, 0, 0, UIntPtr.Zero);

                SendVirtualKey(vk);

                if (hasShift) keybd_event(0x10, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
                if (hasAlt) keybd_event(0x12, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
                if (hasCtrl) keybd_event(0x11, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WindowsMouseController] Keyboard input error: {ex.Message}");
            }
        }


        public void EmergencyStop()
        {
            try
            {
                if (IsLeftHeld)
                {
                    SendMouseInput(MOUSEEVENTF_LEFTUP);
                    IsLeftHeld = false;
                }
                if (IsRightHeld)
                {
                    SendMouseInput(MOUSEEVENTF_RIGHTUP);
                    IsRightHeld = false;
                }
                SendMouseInput(MOUSEEVENTF_MIDDLEUP);
            }
            catch
            {
                // Ignore safety cleanup errors
            }
        }
    }
}

