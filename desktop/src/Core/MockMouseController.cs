namespace AirCursorDesktop.Core
{
    public class MockMouseController : IMouseController
    {
        public int CurrentX { get; private set; } = 500;
        public int CurrentY { get; private set; } = 500;
        public bool IsLeftHeld { get; private set; }
        public bool IsRightHeld { get; private set; }
        public int MoveCount { get; private set; }
        public int ClickCount { get; private set; }
        public int ScrollDeltaTotal { get; private set; }
        public bool EmergencyStopped { get; private set; }

        public void Move(int dx, int dy)
        {
            dx = System.Math.Clamp(dx, -150, 150);
            dy = System.Math.Clamp(dy, -150, 150);
            CurrentX += dx;
            CurrentY += dy;
            MoveCount++;
        }

        public void LeftDown()
        {
            IsLeftHeld = true;
        }

        public void LeftUp()
        {
            IsLeftHeld = false;
        }

        public void ClickLeft()
        {
            ClickCount++;
            LeftDown();
            LeftUp();
        }

        public void RightDown()
        {
            IsRightHeld = true;
        }

        public void RightUp()
        {
            IsRightHeld = false;
        }

        public void ClickRight()
        {
            RightDown();
            RightUp();
        }

        public void MiddleDown() { }
        public void MiddleUp() { }

        public void Scroll(int deltaY)
        {
            ScrollDeltaTotal += deltaY;
        }

        public void EmergencyStop()
        {
            IsLeftHeld = false;
            IsRightHeld = false;
            EmergencyStopped = true;
        }
    }
}
