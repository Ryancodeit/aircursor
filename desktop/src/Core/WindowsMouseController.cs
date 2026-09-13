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
