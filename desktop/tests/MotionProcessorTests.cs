using Xunit;
using AirCursorDesktop.Core;

namespace AirCursorDesktop.Tests
{
    public class MotionProcessorTests
    {
        [Fact]
        public void ProcessMotion_ValidInput_MovesMouseCoordinates()
        {
            var mockMouse = new MockMouseController();
            var processor = new MotionProcessor(mockMouse) { Sensitivity = 1.0 };

            processor.ProcessMotion(10.0, 15.0);

            Assert.Equal(510, mockMouse.CurrentX);
            Assert.Equal(515, mockMouse.CurrentY);
            Assert.Equal(1, mockMouse.MoveCount);
        }

        [Fact]
        public void ProcessMotion_DeadZone_SuppressesMicroMovement()
        {
            var mockMouse = new MockMouseController();
            var processor = new MotionProcessor(mockMouse) { DeadZone = 0.1 };

            processor.ProcessMotion(0.05, 0.05);

            Assert.Equal(500, mockMouse.CurrentX);
            Assert.Equal(500, mockMouse.CurrentY);
            Assert.Equal(0, mockMouse.MoveCount);
        }

        [Fact]
        public void ProcessMotion_NaNAndInfinity_RejectsInvalidValues()
        {
            var mockMouse = new MockMouseController();
            var processor = new MotionProcessor(mockMouse);

            processor.ProcessMotion(double.NaN, 10.0);
            processor.ProcessMotion(10.0, double.PositiveInfinity);

            Assert.Equal(500, mockMouse.CurrentX);
            Assert.Equal(500, mockMouse.CurrentY);
            Assert.Equal(0, mockMouse.MoveCount);
        }

        [Fact]
        public void ProcessMotion_ExcessiveMovement_ClampsMaximumDelta()
        {
            var mockMouse = new MockMouseController();
            var processor = new MotionProcessor(mockMouse) { Sensitivity = 1.0 };

            processor.ProcessMotion(500.0, -500.0);

            // Clamped to 150 and -150
            Assert.Equal(650, mockMouse.CurrentX);
            Assert.Equal(350, mockMouse.CurrentY);
        }

        [Fact]
        public void ProcessAction_ClicksAndMouseEvents_ExecutesCorrectly()
        {
            var mockMouse = new MockMouseController();
            var processor = new MotionProcessor(mockMouse);

            processor.ProcessAction("click");
            Assert.Equal(1, mockMouse.ClickCount);

            processor.ProcessAction("drag_start");
            Assert.True(mockMouse.IsLeftHeld);

            processor.ProcessAction("drag_end");
            Assert.False(mockMouse.IsLeftHeld);
        }

        [Fact]
        public void TriggerEmergencyStop_ReleasesHeldButtonsAndHaltsMotion()
        {
            var mockMouse = new MockMouseController();
            var processor = new MotionProcessor(mockMouse);

            processor.ProcessAction("drag_start");
            Assert.True(mockMouse.IsLeftHeld);

            processor.TriggerEmergencyStop();

            Assert.False(mockMouse.IsLeftHeld);
            Assert.True(mockMouse.EmergencyStopped);
            Assert.False(processor.IsActive);

            // Additional motion should be ignored
            processor.ProcessMotion(20.0, 20.0);
            Assert.Equal(500, mockMouse.CurrentX);
        }

        [Fact]
        public void HandleDisconnect_ReleasesHeldButtonsAndDeactivates()
        {
            var mockMouse = new MockMouseController();
            var processor = new MotionProcessor(mockMouse);

            processor.ProcessAction("mouse_down", "right");
            Assert.True(mockMouse.IsRightHeld);

            processor.HandleDisconnect();

            Assert.False(mockMouse.IsRightHeld);
            Assert.False(processor.IsActive);
        }
    }
}
