<template>
  <div class="page-container" :style="{ backgroundImage: 'url(' + backgroundImageUrl + ')' }">
    <div class="left-container">
      <el-progress
        class="footer-progress"
        ref="leftProgress"
        type="circle"
        :percentage="percentage.leftPercentage"
        stroke-width=10
        :format="formatLeft"
      ></el-progress>
      <el-progress
        class="footer-progress"
        ref="ptzProgress"
        type="circle"
        :percentage="percentage.ptzPercentage"
        color="orange"
        stroke-width=10
        :format="PTZLevel"
      ></el-progress>
      <el-progress
        class="footer-progress"
        ref="rightProgress"
        type="circle"
        :percentage="percentage.rightPercentage"
        color="yellow"
        stroke-width=10
        :format="formatRight"
      ></el-progress>
      <el-progress
        class="footer-progress"
        ref="pitchProgress"
        type="circle"
        :percentage="percentage.pitchPercentage"
        color="purple"
        stroke-width=10
        :format="PTZPitch"
      ></el-progress>
    </div>
    <div class="right-container">
      <el-progress
        class="footer-progress"
        type="dashboard"
        :percentage="percentage.backPercentage"
        color="red"
        stroke-width=10
        :format="formatBack"
      ></el-progress>
      <el-progress
        class="footer-progress"
        type="dashboard"
        :percentage="percentage.forwardPercentage"
        text="speed"
        color="green"
        stroke-width=10
        :format="formatForward"
      ></el-progress>
    </div>
  </div>
</template>
<script>
import mqtt from "mqtt";

export default {
  name: "Control",
  data() {
    return {
      percentage:{
        leftPercentage: 0,
        rightPercentage: 0,
        ptzPercentage: 50,
        pitchPercentage: 50,
        forwardPercentage: 0,
        backPercentage: 0,
      },
      sendToCarData:{
        turnLeft: 0,
        turnRight: 0,
        ptzLevel: 90,
        ptzPitch: 90,
        goForward: 0,
        goBack: 0,
      },
      gamepadIndex: null,
      backgroundImagePath: '', // 初始为空字符串，用于存储背景图片的Base64数据
      shouldRefresh: true,
      videoName: null,
      connection: {
        protocol: "ws",
        host: "82.157.52.81",
        // ws: 8083; wss: 8084
        port: 8083,
        endpoint: "/mqtt",
        // for more options, please refer to https://github.com/mqttjs/MQTT.js#mqttclientstreambuilder-options
        clean: true,
        connectTimeout: 30 * 1000, // ms
        reconnectPeriod: 4000, // ms
        clientId: "emqx_vue_" + Math.random().toString(16).substring(2, 8),
        // auth
        username: "test",
        password: "sunrongnan",
      },
      publish: {
        topic: "sunrongnan",
        qos: 0,
        payload: '{ "msg": "Hello, I am browser." }',
      },
      receiveNews: "",
      qosList: [0, 1, 2],
      client: {
        connected: false,
      },
      subscribeSuccess: false,
      connecting: false,
      retryTimes: 0,
    };
  },
  created() {
  },
  computed: {
    backgroundImageUrl() {
      return `data:image/jpeg;base64,${this.backgroundImagePath}`;
    }
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
      this.percentage.backPercentage = Math.round(leftTrigger * 100);
      this.percentage.forwardPercentage = Math.round(rightTrigger * 100);

      this.sendToCarData.goBack = mapValue(leftTrigger,0,1,0,180);
      this.sendToCarData.goForward = mapValue(rightTrigger,0,1,0,180);

      // Handle left stick for direction control
      const leftStickX = axes[0];
      if (leftStickX > 0) {
        this.percentage.leftPercentage = 0;
        this.percentage.rightPercentage = Math.round(leftStickX * 100);

        this.sendToCarData.turnLeft = 0;
        this.sendToCarData.turnRight = mapValue(leftStickX,0,1,0,180);
      } else {
        this.percentage.leftPercentage = Math.round(-leftStickX * 100);
        this.percentage.rightPercentage = 0;

        this.sendToCarData.turnLeft = 0;
        this.sendToCarData.turnRight = mapValue(leftStickX,-1,0,0,180);
      }

      // Handle right stick for PTZ control
      const rightStickY = axes[3];
      const rightStickX = axes[2];
      this.percentage.ptzPercentage = mapValue(rightStickX,-1,1,0,100);
      this.percentage.pitchPercentage = mapValue(rightStickY,-1,1,0,100);
      this.sendToCarData.ptzLevel = mapValue(rightStickX,-1,1,0,180);
      this.sendToCarData.ptzPitch = mapValue(rightStickY,-1,1,0,180);
      // 发送到mqtt服务器
      this.publish.payload=JSON.stringify(this.percentage);
      this.doPublish();
    },
    pollGamepadState() {
      if (this.gamepadIndex !== null) {
        this.handleControllerInput();
      }

      requestAnimationFrame(this.pollGamepadState);
    },
    initData() {
      this.client = {
        connected: false,
      };
      this.retryTimes = 0;
      this.connecting = false;
      this.subscribeSuccess = false;
    },
    handleOnReConnect() {
      this.retryTimes += 1;
      if (this.retryTimes > 5) {
        try {
          this.client.end();
          this.initData();
          this.$message.error("Connection maxReconnectTimes limit, stop retry");
        } catch (error) {
          this.$message.error(error.toString());
        }
      }
    },
    doPublish() {
      const { topic, qos, payload } = this.publish
      this.client.publish(topic, payload, { qos }, error => {
        if (error) {
          console.log('Publish error', error)
        }
      })
    },
    createConnection() {
      try {
        this.connecting = true;
        const { protocol, host, port, endpoint, ...options } = this.connection;
        const connectUrl = `${protocol}://${host}:${port}${endpoint}`;
        this.client = mqtt.connect(connectUrl, options);
        if (this.client.on) {
          this.client.on("connect", () => {
            this.connecting = false;
            this.$message({
              message: '连接mqtt服务器成功',
              type: 'success'
            })
            console.log("Connection succeeded!");
          });
          this.client.on("reconnect", this.handleOnReConnect);
          this.client.on("error", (error) => {
            console.log("Connection failed", error);
          });
          this.client.on("message", (topic, message) => {
            this.receiveNews = this.receiveNews.concat(message);
            console.log(`Received message ${message} from topic ${topic}`);
          });
        }
      } catch (error) {
        this.connecting = false;
        console.log("mqtt.connect error", error);
      }
    },
  },
  mounted() {
    this.videoName = this.$route.query.videoName;
    const socket = new WebSocket('ws://localhost:8333/myWs/'+this.videoName);
    this.publish.topic=this.videoName;
    this.publish.payload=JSON.stringify(this.percentage);
    // console.log(JSON.stringify(this.percentage));
    console.log(this.publish.topic);
    this.createConnection();
    // this.doPublish();
    socket.addEventListener('message', (event) => {
      const imageData = event.data; // 接收到的Base64图片数据
      // this.backgroundImage = `data:image/jpeg;base64, ${imageData}`;
      // this.backgroundImagePath = `data:image/jpeg;base64, ${imageData}`;
      this.backgroundImagePath = imageData;
    });
    // Add event listener for controller connection
    window.addEventListener("gamepadconnected", (event) => {
      const gamepad = event.gamepad;
      // Only listen to Xbox controllers
      if (gamepad.id.includes("Xbox")) {
        this.gamepadIndex = gamepad.index;
        // this.shouldRefresh = true;
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

<style scoped lang="scss">
  .footer-progress {
    margin: 0 100px; /* 调整进度条的左右间距 */
    margin-top: 50px;
    color: red;
  }
  .left-container {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .right-container {
    position: absolute;
    right: 0;
    top: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }
  .page-container {
    background: url("../../assets/401_images/401.gif");
    width: 100%;
    height: 100%;
    bottom: 0;
    position: fixed;
    margin-top: 500px;
    z-index: -1;
    background-size: auto 100%; /* 修改背景图片的宽高比为1:0.75 */
    background-repeat: no-repeat; /* 设置背景图片不重复显示 */
    background-position: center; /* 将背景图片置于中间位置 */
  }
</style>
