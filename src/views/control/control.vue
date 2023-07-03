<template>
    <div class="home-container">
        <el-container class="full-height">
            <el-aside width="200px">
                <el-progress
                    ref="leftProgress"
                    type="circle"
                    :percentage="leftPercentage"
                    color="blue"
                    :format="formatLeft"
                ></el-progress>
                <el-progress
                    ref="rightProgress"
                    type="circle"
                    :percentage="rightPercentage"
                    color="yellow"
                    :format="formatRight"
                ></el-progress>
                <el-progress
                    ref="ptzProgress"
                    type="circle"
                    :percentage="ptzPercentage"
                    color="orange"
                    :format="PTZLevel"
                ></el-progress>
                <el-progress
                    ref="pitchProgress"
                    type="circle"
                    :percentage="pitchPercentage"
                    color="purple"
                    :format="PTZPitch"
                ></el-progress>
            </el-aside>
            <el-container>
                <el-header height="0px">Header</el-header>
                <el-main class="main-container">
                    <!-- Video elements -->
<!--                    <div v-for="(row, index) in tableData" :key="index">-->
<!--                        <video :src="row.videoData" width="300" height="200" controls></video>-->
<!--                    </div>-->
                </el-main>
                <el-footer class="custom-footer" height="200px">
                    <el-progress
                        class="footer-progress"
                        type="dashboard"
                        :percentage="backPercentage"
                        color="red"
                        :format="formatBack"
                    ></el-progress>
                    <el-progress
                        class="footer-progress"
                        type="dashboard"
                        :percentage="forwardPercentage"
                        text="speed"
                        color="green"
                        :format="formatForward"
                    ></el-progress>
                </el-footer>
            </el-container>
        </el-container>
    </div>
</template>

<script>
export default {
    name: "Control",
    data() {
        return {
            leftPercentage: 0,
            rightPercentage: 0,
            ptzPercentage: 0,
            pitchPercentage: 0,
            forwardPercentage: 0,
            backPercentage: 0,
            gamepadIndex: null,
        };
    },
    methods: {
        formatForward(percentage) {
            return percentage + "%\n 前进";
        },
        formatBack(percentage) {
            return percentage + "%\n 后退";
        },
        PTZLevel(percentage) {
            return  Math.round(mapValue(percentage,0,100,0,180)) + "°\n 云台水平";
        },
        PTZPitch(percentage) {
            return Math.round(mapValue(percentage,0,100,0,180)) + "°\n 云台俯仰";
        },
        formatLeft(percentage) {
            return percentage + "%\n 左转";
        },
        formatRight(percentage) {
            return percentage + "%\n 右转";
        },
        handleControllerInput() {
            const gamepad = navigator.getGamepads()[this.gamepadIndex];
            if (!gamepad) return;

            const { axes, buttons } = gamepad;

            // Handle left and right triggers
            const leftTrigger = buttons[6].value;
            const rightTrigger = buttons[7].value;
            this.backPercentage = Math.round(leftTrigger * 100);
            this.forwardPercentage = Math.round(rightTrigger * 100);

            // Handle left stick for direction control
            const leftStickX = axes[0];
            if (leftStickX > 0) {
                this.leftPercentage = 0;
                this.rightPercentage = Math.round(leftStickX * 100);
            } else {
                this.leftPercentage = Math.round(-leftStickX * 100);
                this.rightPercentage = 0;
            }

            // Handle right stick for PTZ control
            const rightStickY = axes[3];
            const rightStickX = axes[2];
            this.ptzPercentage = mapValue(rightStickX,-1,1,0,100);
            // this.pitchPercentage = Math.round(rightStickX * 100);
            this.pitchPercentage = mapValue(rightStickY,-1,1,0,100);
        },
        pollGamepadState() {
            if (this.gamepadIndex !== null) {
                this.handleControllerInput();
            }

            requestAnimationFrame(this.pollGamepadState);
        },
    },
    mounted() {
        // Add event listener for controller connection
        window.addEventListener("gamepadconnected", (event) => {
            const gamepad = event.gamepad;
            // Only listen to Xbox controllers
            if (gamepad.id.includes("Xbox")) {
                this.gamepadIndex = gamepad.index;
                requestAnimationFrame(this.pollGamepadState);
            }
        });

        // Add event listener for controller disconnection
        window.addEventListener("gamepaddisconnected", (event) => {
            const gamepad = event.gamepad;
            if (gamepad.index === this.gamepadIndex) {
                this.gamepadIndex = null;
            }
        });
    },
};
function mapValue(value, fromMin, fromMax, toMin, toMax) {
    // 首先计算原始值在原始区间中的比例
    const normalizedValue = (value - fromMin) / (fromMax - fromMin);

    // 然后使用比例将值映射到目标区间
    const mappedValue = normalizedValue * (toMax - toMin) + toMin;

    // 返回映射后的值
    return mappedValue;
}

</script>

<style scoped>
.home-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
}

.full-height {
    height: 100%;
}

.el-header,
.el-footer {
    background-color: #b3c0d1;
    color: #333;
    text-align: center;
    line-height: 160px;
}

.el-aside {
    background-color: #d3dce6;
    color: #333;
    text-align: center;
    line-height: 250px;
}

.el-main {
    background-color: #e9eef3;
    color: #333;
    text-align: center;
    line-height: 160px;
}

.footer-progress {
    margin: 0 100px; /* 调整进度条的左右间距 */
    margin-top: 50px;
}
</style>
