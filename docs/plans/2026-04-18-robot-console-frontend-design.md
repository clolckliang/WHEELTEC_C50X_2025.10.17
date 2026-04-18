# Robot Console Frontend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the existing ROS robot web teleop page into a modular React + TypeScript console while reusing the current ROS topics, CSV API, and control semantics.

**Architecture:** Keep the ROS backend contract stable and move the browser from a single `index.html` into a Vite SPA built around a feature-sliced structure. Centralize rosbridge access in a `RosClient`, adapt ROS messages into typed domain models, push them into Zustand stores, and compose the UI from pages, widgets, features, entities, and shared primitives.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui-style components, Zustand, Recharts, roslib, React Router

---

### Task 1: Audit the Existing Web Control Contract

**Files:**
- Read: `turn_on_wheeltec_robot/web/index.html`
- Read: `turn_on_wheeltec_robot/scripts/cmd_vel_web_adapter.py`
- Read: `turn_on_wheeltec_robot/scripts/data_collector.py`
- Read: `turn_on_wheeltec_robot/scripts/web_dashboard_server.py`
- Read: `turn_on_wheeltec_robot/launch/web_control.launch`

**Step 1:** Record the reusable topic and API surface.

**Step 2:** Preserve the following contracts in the new frontend:
- Publish `/cmd_vel_web`
- Publish `/web/heartbeat`
- Publish `/web/estop`
- Publish `/web/data_collect/command`
- Subscribe `/odom`
- Subscribe `/imu`
- Subscribe `/PowerVoltage`
- Subscribe `/current_data`
- Subscribe `/web/control_status`
- Subscribe `/web/data_collect/status`
- Fetch `/api/data/list`
- Download `/api/data/download/<name>`

**Step 3:** Keep the current command semantics:
- Touch joystick remains valid
- Keyboard remains supported
- Gamepad remains high-priority manual source
- Recorder commands keep `start[:label]` and `stop`

### Task 2: Scaffold the New Frontend Workspace

**Files:**
- Create: `turn_on_wheeltec_robot/webapp/package.json`
- Create: `turn_on_wheeltec_robot/webapp/tsconfig.json`
- Create: `turn_on_wheeltec_robot/webapp/tsconfig.app.json`
- Create: `turn_on_wheeltec_robot/webapp/tsconfig.node.json`
- Create: `turn_on_wheeltec_robot/webapp/vite.config.ts`
- Create: `turn_on_wheeltec_robot/webapp/tailwind.config.ts`
- Create: `turn_on_wheeltec_robot/webapp/postcss.config.cjs`
- Create: `turn_on_wheeltec_robot/webapp/index.html`
- Create: `turn_on_wheeltec_robot/webapp/components.json`

**Step 1:** Configure Vite to build into `turn_on_wheeltec_robot/web/dist`.

**Step 2:** Add Tailwind and shadcn-style component foundations.

**Step 3:** Add scripts for `dev`, `build`, `preview`, and `lint`.

### Task 3: Build the Shared Platform Layer

**Files:**
- Create: `turn_on_wheeltec_robot/webapp/src/shared/config/robot.ts`
- Create: `turn_on_wheeltec_robot/webapp/src/shared/lib/cn.ts`
- Create: `turn_on_wheeltec_robot/webapp/src/shared/lib/format.ts`
- Create: `turn_on_wheeltec_robot/webapp/src/shared/lib/browser.ts`
- Create: `turn_on_wheeltec_robot/webapp/src/shared/lib/ros/RosClient.ts`
- Create: `turn_on_wheeltec_robot/webapp/src/shared/lib/ros/adapters.ts`
- Create: `turn_on_wheeltec_robot/webapp/src/shared/types/*.ts`
- Create: `turn_on_wheeltec_robot/webapp/src/shared/hooks/*.ts`
- Create: `turn_on_wheeltec_robot/webapp/src/shared/ui/*.tsx`

**Step 1:** Implement typed domain models for telemetry, recorder, faults, control, and gamepad.

**Step 2:** Implement a reconnecting `RosClient` with publish, subscribe, topic lifecycle management, and connection listeners.

**Step 3:** Build message adapters that convert raw ROS messages into app-facing models.

### Task 4: Create Domain and Feature Stores

**Files:**
- Create: `turn_on_wheeltec_robot/webapp/src/entities/robot/model/robot-store.ts`
- Create: `turn_on_wheeltec_robot/webapp/src/entities/fault/model/fault-store.ts`
- Create: `turn_on_wheeltec_robot/webapp/src/features/ros-connect/model/ros-connect-store.ts`
- Create: `turn_on_wheeltec_robot/webapp/src/features/manual-control/model/control-store.ts`
- Create: `turn_on_wheeltec_robot/webapp/src/features/gamepad/model/gamepad-store.ts`
- Create: `turn_on_wheeltec_robot/webapp/src/features/recorder/model/recorder-store.ts`

**Step 1:** Store connection state separately from telemetry state.

**Step 2:** Store rolling chart buffers for Recharts.

**Step 3:** Derive a fault summary from connection state, estop state, voltage, and control status while leaving room for a future Agent.

### Task 5: Implement the Runtime Integration Layer

**Files:**
- Create: `turn_on_wheeltec_robot/webapp/src/features/ros-connect/lib/register-ros-topics.ts`
- Create: `turn_on_wheeltec_robot/webapp/src/features/ros-connect/hooks/useRosRuntime.ts`
- Create: `turn_on_wheeltec_robot/webapp/src/features/manual-control/hooks/useCommandPublisher.ts`
- Create: `turn_on_wheeltec_robot/webapp/src/features/gamepad/lib/GamepadManager.ts`
- Create: `turn_on_wheeltec_robot/webapp/src/features/gamepad/lib/HapticsManager.ts`
- Create: `turn_on_wheeltec_robot/webapp/src/features/gamepad/hooks/useGamepadBridge.ts`
- Create: `turn_on_wheeltec_robot/webapp/src/features/recorder/api/files-api.ts`

**Step 1:** Register all ROS subscriptions once and route data into stores.

**Step 2:** Publish heartbeat and drive commands on timers using current control state.

**Step 3:** Poll the Gamepad API, map Xbox controls, expose haptics placeholders, and let gamepad input override non-touch sources.

**Step 4:** Keep recorder file listing and download URL generation outside page components.

### Task 6: Implement Pages, Widgets, and UI Composition

**Files:**
- Create: `turn_on_wheeltec_robot/webapp/src/app/**/*`
- Create: `turn_on_wheeltec_robot/webapp/src/pages/**/*`
- Create: `turn_on_wheeltec_robot/webapp/src/widgets/**/*`
- Create: `turn_on_wheeltec_robot/webapp/src/features/**/*`
- Create: `turn_on_wheeltec_robot/webapp/src/entities/**/*`

**Step 1:** Build:
- Mobile Control Page
- Desktop Dashboard Page
- Recorder Page

**Step 2:** Build widgets:
- Top bar
- Telemetry grid
- Recorder panel
- Gamepad status panel
- Fault diagnosis card
- Agent panel placeholder
- Logs panel
- Video placeholder

**Step 3:** Add responsive routing and adaptive default entry behavior.

### Task 7: Implement Theme and Visual System

**Files:**
- Create: `turn_on_wheeltec_robot/webapp/src/app/styles/index.css`
- Create: `turn_on_wheeltec_robot/webapp/src/features/theme/**/*`

**Step 1:** Use CSS variables for semantic tokens in light and dark themes.

**Step 2:** Initialize theme from system preference and support manual override.

**Step 3:** Apply a deliberate industrial-console aesthetic instead of a generic admin layout.

### Task 8: Integrate the Built Frontend with the Existing ROS Package

**Files:**
- Modify: `turn_on_wheeltec_robot/scripts/web_dashboard_server.py`
- Modify: `turn_on_wheeltec_robot/README.md`
- Create: `turn_on_wheeltec_robot/webapp/README.md`

**Step 1:** Serve the Vite build output if present.

**Step 2:** Add SPA fallback routing while preserving `/api/data/*`.

**Step 3:** Document how to develop locally and how to build for deployment into the ROS package.

### Task 9: Verification

**Files:**
- Run against: `turn_on_wheeltec_robot/webapp`

**Step 1:** Install dependencies.

**Step 2:** Run `npm run build`.

**Step 3:** Fix TypeScript or bundling issues until the build passes.

**Step 4:** Summarize migration steps from the legacy `web/index.html` page to the new console.
