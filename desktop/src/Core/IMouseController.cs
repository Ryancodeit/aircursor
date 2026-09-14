namespace AirCursorDesktop.Core
{
    public interface IMouseController
    {
        void Move(int dx, int dy);
        void LeftDown();
        void LeftUp();
        void ClickLeft();
        void RightDown();
        void RightUp();
        void ClickRight();
        void MiddleDown();
        void MiddleUp();
        void Scroll(int deltaY);
        void EmergencyStop();
        void ExecuteMediaCommand(string command);
        void ExecuteKeyboardInput(string key, string[]? modifiers = null);
        bool IsLeftHeld { get; }
        bool IsRightHeld { get; }
    }
}

