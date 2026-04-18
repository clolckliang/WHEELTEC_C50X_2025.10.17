export class HapticsManager {
  async pulse(gamepad: Gamepad | null, strongMagnitude = 0.4, duration = 90) {
    const actuator = (gamepad as Gamepad & { vibrationActuator?: { playEffect?: Function } } | null)?.vibrationActuator;
    if (!actuator?.playEffect) {
      return false;
    }

    try {
      await actuator.playEffect("dual-rumble", {
        duration,
        startDelay: 0,
        weakMagnitude: Math.min(1, strongMagnitude * 0.7),
        strongMagnitude,
      });
      return true;
    } catch {
      return false;
    }
  }
}
