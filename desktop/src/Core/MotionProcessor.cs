using System;

namespace AirCursorDesktop.Core
{
    public class MotionProcessor
    {
        private readonly IMouseController _mouse;
        public double Sensitivity { get; set; } = 1.0;
        public double DeadZone { get; set; } = 0.08;
        public bool IsActive { get; set; } = true;
        public bool IsEmergencyStopped { get; private set; } = false;

        public MotionProcessor(IMouseController mouse)
        {
            _mouse = mouse ?? throw new ArgumentNullException(nameof(mouse));
        }

        public void ProcessMotion(double dx, double dy)
        {
            if (!IsActive || IsEmergencyStopped) return;

            // Reject NaN and Infinity
            if (double.IsNaN(dx) || double.IsNaN(dy) || double.IsInfinity(dx) || double.IsInfinity(dy))
            {
                return;
            }

            // Deadband filtering
            if (Math.Abs(dx) < DeadZone) dx = 0;
            if (Math.Abs(dy) < DeadZone) dy = 0;

            if (dx == 0 && dy == 0) return;

            // Apply sensitivity scaling
            int scaledDx = (int)Math.Round(dx * Sensitivity);
            int scaledDy = (int)Math.Round(dy * Sensitivity);

            // Safety clamping
            scaledDx = Math.Clamp(scaledDx, -150, 150);
            scaledDy = Math.Clamp(scaledDy, -150, 150);

            _mouse.Move(scaledDx, scaledDy);
        }

        public void ProcessAction(string actionType, string? button = null, int? scrollDy = null)
        {
            if (!IsActive || IsEmergencyStopped) return;

            switch (actionType)
            {
                case "click":
                    _mouse.ClickLeft();
                    break;
                case "right_click":
                    _mouse.ClickRight();
                    break;
                case "mouse_down":
                case "drag_start":
                    if (button == "right") _mouse.RightDown();
                    else _mouse.LeftDown();
                    break;
                case "mouse_up":
                case "drag_end":
                    if (button == "right") _mouse.RightUp();
                    else _mouse.LeftUp();
                    break;
                case "scroll":
                    if (scrollDy.HasValue && !double.IsNaN(scrollDy.Value))
                    {
                        _mouse.Scroll(scrollDy.Value);
                    }
                    break;
                case "emergency_stop":
                    TriggerEmergencyStop();
                    break;
            }
        }

        public void TriggerEmergencyStop()
        {
            IsEmergencyStopped = true;
            IsActive = false;
            _mouse.EmergencyStop();
        }

        public void Resume()
        {
            IsEmergencyStopped = false;
            IsActive = true;
        }

        public void HandleDisconnect()
        {
            IsActive = false;
            _mouse.EmergencyStop();
        }
    }
}
