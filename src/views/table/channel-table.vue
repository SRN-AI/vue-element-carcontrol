<template xmlns="http://www.w3.org/1999/html">
  <div class="app-container">
    <div class="filter-container">
      <div align="center">
        <el-switch v-model="totalSwitch" active-color="#13ce66" inactive-color="#ff4949" width="100" name="通道总开关" @change="handleSwitchChange" />
        <span>通道总开关</span>
      </div>
      <el-input v-model="listQuery.name" placeholder="name" style="width: 200px;" class="filter-item" @keyup.enter.native="handleFilter" />
      <el-select v-model="listQuery.importance" placeholder="Imp" clearable style="width: 90px" class="filter-item">
        <el-option v-for="item in importanceOptions" :key="item" :label="item" :value="item" />
      </el-select>
      <el-select v-model="listQuery.type" placeholder="Type" clearable class="filter-item" style="width: 130px">
        <el-option v-for="item in calendarTypeOptions" :key="item.key" :label="item.display_name+'('+item.key+')'" :value="item.key" />
      </el-select>
      <el-select v-model="listQuery.sort" style="width: 140px" class="filter-item" @change="handleFilter">
        <el-option v-for="item in sortOptions" :key="item.key" :label="item.label" :value="item.key" />
      </el-select>
      <el-button v-waves class="filter-item" type="primary" icon="el-icon-search" @click="handleFilter">
        Search
      </el-button>
      <!--      <el-button class="filter-item" style="margin-left: 10px;" type="primary" icon="el-icon-edit" @click="handleCreate">-->
      <!--        Add-->
      <!--      </el-button>-->
      <!--      <el-button v-waves :loading="downloadLoading" class="filter-item" type="primary" icon="el-icon-download" @click="handleDownload">-->
      <!--        Export-->
      <!--      </el-button>-->
      <!--      <el-checkbox v-model="showReviewer" class="filter-item" style="margin-left:15px;" @change="tableKey=tableKey+1">-->
      <!--        reviewer-->
      <!--      </el-checkbox>-->
    </div>

    <el-table
      :key="tableKey"
      v-loading="listLoading"
      :data="list"
      border
      fit
      highlight-current-row
      style="width: 100%;"
      @sort-change="sortChange"
    >
      <el-table-column label="序号" width="60">
        <template slot-scope="scope">
          {{ scope.$index }}
        </template>
      </el-table-column>
      <el-table-column label="视频" width="300">
        <template slot-scope="scope">
          <img
            :ref="`videoImage_${scope.row.name}`"
            :src="scope.row.videoData"
            width="300"
            height="200"
          >
        </template>
      </el-table-column>
      <el-table-column label="name" align="center">
        <template slot-scope="{row}">
          <span>{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column label="clientId" align="center">
        <template slot-scope="{row}">
          <span>{{ row.clientId }}</span>
        </template>
      </el-table-column>
      <el-table-column label="clientAddress" align="center">
        <template slot-scope="{row}">
          <span>{{ row.clientAddress }}</span>
        </template>
      </el-table-column>
      <el-table-column label="clientPort" align="center">
        <template slot-scope="{row}">
          <span>{{ row.clientPort }}</span>
        </template>
      </el-table-column>
      <el-table-column
        class-name="status-col"
        label="连接状态"
        width="110"
        align="center"
      >
        <template slot-scope="scope">
          <el-tag :type="scope.row.channelEnabled | statusFilter">{{
            scope.row.channelEnabled
          }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="400px">
        <template slot-scope="scope">
          <el-button
            type="primary"
            @click="channelSwitch(scope.row)"
          >开关</el-button>
          <el-button
            type="warning"
            :disabled="scope.row.channelEnabled === true ? false : true"
            @click="refreshChannel(scope.row)"
          >刷新</el-button>
          <el-button
            type="success"
            :disabled="scope.row.channelEnabled === true ? false : true"
            @click="openFullscreen(scope.row, scope.$index)"
          >全屏</el-button>
          <el-button
            type="danger"
            :disabled="scope.row.channelEnabled === true ? false : true"
            @click="toDelete(scope.row)"
          >控制</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script>
import { fetchPv, createArticle, updateArticle } from '@/api/article'
import waves from '@/directive/waves' // waves directive
import { parseTime } from '@/utils'
import { getChannelList } from '@/api/table'
import axios from 'axios'
const calendarTypeOptions = [
  { key: 'CN', display_name: 'China' },
  { key: 'US', display_name: 'USA' },
  { key: 'JP', display_name: 'Japan' },
  { key: 'EU', display_name: 'Eurozone' }
]

// arr to obj, such as { CN : "China", US : "USA" }
const calendarTypeKeyValue = calendarTypeOptions.reduce((acc, cur) => {
  acc[cur.key] = cur.display_name
  return acc
}, {})

export default {
  name: 'ComplexTable',
  directives: { waves },
  filters: {
    statusFilter(status) {
      const statusMap = {
        published: 'success',
        draft: 'info',
        deleted: 'danger'
      }
      return statusMap[status]
    },
    typeFilter(type) {
      return calendarTypeKeyValue[type]
    }
  },
  data() {
    return {
      tableKey: 0,
      list: null,
      total: 0,
      listLoading: true,
      totalSwitch: false,
      listQuery: {
        page: 1,
        limit: 20,
        importance: undefined,
        name: undefined,
        type: undefined,
        sort: '+id'
      },
      importanceOptions: [1, 2, 3],
      calendarTypeOptions,
      sortOptions: [{ label: 'ID Ascending', key: '+id' }, { label: 'ID Descending', key: '-id' }],
      statusOptions: ['published', 'draft', 'deleted'],
      showReviewer: false,
      temp: {
        id: undefined,
        importance: 1,
        remark: '',
        timestamp: new Date(),
        title: '',
        type: '',
        status: 'published'
      },
      dialogFormVisible: false,
      dialogStatus: '',
      textMap: {
        update: 'Edit',
        create: 'Create'
      },
      dialogPvVisible: false,
      pvData: [],
      rules: {
        type: [{ required: true, message: 'type is required', trigger: 'change' }],
        timestamp: [{ type: 'date', required: true, message: 'timestamp is required', trigger: 'change' }],
        title: [{ required: true, message: 'title is required', trigger: 'blur' }]
      },
      downloadLoading: false
    }
  },
  created() {
    this.getList()
    this.handleGetSwitchStatus()
  },
  methods: {
    getList() {
      this.listLoading = true
      getChannelList(this.getChannelList).then(response => {
        this.list = response.data.items
        this.total = response.data.total
        this.list.forEach(row => {
          this.createWebSocketConnection(row) // 创建 WebSocket 连接
        })

        // Just to simulate the time of the request
        setTimeout(() => {
          this.listLoading = false
        }, 1.5 * 1000)
      })
    },
    handleFilter() {
      this.listQuery.page = 1
      this.getList()
    },
    handleModifyStatus(row, status) {
      this.$message({
        message: '操作Success',
        type: 'success'
      })
      row.status = status
    },
    sortChange(data) {
      const { prop, order } = data
      if (prop === 'id') {
        this.sortByID(order)
      }
    },
    sortByID(order) {
      if (order === 'ascending') {
        this.listQuery.sort = '+id'
      } else {
        this.listQuery.sort = '-id'
      }
      this.handleFilter()
    },
    resetTemp() {
      this.temp = {
        id: undefined,
        importance: 1,
        remark: '',
        timestamp: new Date(),
        title: '',
        status: 'published',
        type: ''
      }
    },
    handleCreate() {
      this.resetTemp()
      this.dialogStatus = 'create'
      this.dialogFormVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    createData() {
      this.$refs['dataForm'].validate((valid) => {
        if (valid) {
          this.temp.id = parseInt(Math.random() * 100) + 1024 // mock a id
          this.temp.author = 'vue-element-admin'
          createArticle(this.temp).then(() => {
            this.list.unshift(this.temp)
            this.dialogFormVisible = false
            this.$notify({
              title: 'Success',
              message: 'Created Successfully',
              type: 'success',
              duration: 2000
            })
          })
        }
      })
    },
    handleUpdate(row) {
      this.temp = Object.assign({}, row) // copy obj
      this.temp.timestamp = new Date(this.temp.timestamp)
      this.dialogStatus = 'update'
      this.dialogFormVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    updateData() {
      this.$refs['dataForm'].validate((valid) => {
        if (valid) {
          const tempData = Object.assign({}, this.temp)
          tempData.timestamp = +new Date(tempData.timestamp) // change Thu Nov 30 2017 16:41:05 GMT+0800 (CST) to 1512031311464
          updateArticle(tempData).then(() => {
            const index = this.list.findIndex(v => v.id === this.temp.id)
            this.list.splice(index, 1, this.temp)
            this.dialogFormVisible = false
            this.$notify({
              title: 'Success',
              message: 'Update Successfully',
              type: 'success',
              duration: 2000
            })
          })
        }
      })
    },
    handleDelete(row, index) {
      this.$notify({
        title: 'Success',
        message: 'Delete Successfully',
        type: 'success',
        duration: 2000
      })
      this.list.splice(index, 1)
    },
    handleFetchPv(pv) {
      fetchPv(pv).then(response => {
        this.pvData = response.data.pvData
        this.dialogPvVisible = true
      })
    },
    handleDownload() {
      this.downloadLoading = true
      import('@/vendor/Export2Excel').then(excel => {
        const tHeader = ['timestamp', 'title', 'type', 'importance', 'status']
        const filterVal = ['timestamp', 'title', 'type', 'importance', 'status']
        const data = this.formatJson(filterVal)
        excel.export_json_to_excel({
          header: tHeader,
          data,
          filename: 'table-list'
        })
        this.downloadLoading = false
      })
    },
    formatJson(filterVal) {
      return this.list.map(v => filterVal.map(j => {
        if (j === 'timestamp') {
          return parseTime(v[j])
        } else {
          return v[j]
        }
      }))
    },
    getSortClass: function(key) {
      const sort = this.listQuery.sort
      return sort === `+${key}` ? 'ascending' : 'descending'
    },
    channelSwitch(row) {
      const name = row.name
      axios
        .post(`http://localhost:8081/udp/channel/switch?name=${name}`)
        .then(resp => {
          // 处理开关请求的响应
          console.log(resp.data)
          // 更新对应行的连接状态
          // this.getChannelList();
          row.channelEnabled = !row.channelEnabled
        })
        .catch(error => {
          // 处理请求错误
          console.error(error)
        })
    },
    handleSwitchOn() {
      // 总开关状态改变时触发的方法
      const switchStatus = 'on'
      axios
        .post(`http://localhost:8081/udp/switch?status=${switchStatus}`)
        .then(resp => {
          // 处理开关请求的响应
          console.log(resp.data)
          // eslint-disable-next-line no-constant-condition
          if ((resp.data = 'true')) {
            this.$notify({
              title: '成功',
              message: '开启所有通道成功',
              type: 'success'
            })
          } else {
            this.$notify({
              title: '失败',
              message: '开启所有通道失败',
              type: 'warning'
            })
          }
        })
        .catch(error => {
          // 处理请求错误
          console.error(error)
        })
    },
    handleSwitchOff() {
      // 总开关状态改变时触发的方法
      const switchStatus = 'off'
      axios
        .post(`http://localhost:8081/udp/switch?status=${switchStatus}`)
        .then(resp => {
          // 处理开关请求的响应
          console.log(resp.data)
          // eslint-disable-next-line no-constant-condition
          if ((resp.data = 'false')) {
            this.$notify({
              title: '成功',
              message: '关闭所有通道成功',
              type: 'success'
            })
          } else {
            this.$notify({
              title: '失败',
              message: '关闭所有通道失败',
              type: 'warning'
            })
          }
        })
        .catch(error => {
          // 处理请求错误
          console.error(error)
        })
    },
    handleSwitchChange() {
      // 总开关状态改变时触发的方法
      const switchStatus = this.totalSwitch ? 'on' : 'off'
      axios
        .post(`http://localhost:8081/udp/switch?status=${switchStatus}`)
        .then((resp) => {
          // 处理开关请求的响应
          console.log(resp.data)
          this.totalSwitch = resp.data // 更新 totalSwitch 的值;
        })
        .catch((error) => {
          // 处理请求错误
          console.error(error)
        })
    },
    handleGetSwitchStatus() {
      // 总开关状态改变时触发的方法
      axios
        .post(`http://localhost:8081/udp/getSwitchStatus`)
        .then((resp) => {
          // 处理开关请求的响应
          console.log(resp.data)
          this.totalSwitch = resp.data // 更新 totalSwitch 的值
        })
        .catch((error) => {
          // 处理请求错误
          console.error(error)
        })
    },
    handleWebSocketMessage(event, row) {
      const base64Data = event.data
      // 更新 videoData 属性
      row.videoData = `data:image/jpeg;base64,${base64Data}`
      if (row.videoData.length > 1000) {
        // 使用 Vue.nextTick 强制更新 DOM
        this.$nextTick(() => {
          const imgElement = this.$refs[`videoImage_${row.name}`]
          if (imgElement) {
            imgElement.src = row.videoData
          }
        })
      }
      if (row.webSocket.readyState === WebSocket.CLOSED) {
        // WebSocket 连接断开，进行自动重连
        setTimeout(() => {
          this.createWebSocketConnection(row)
        }, this.reconnectInterval)
      }
    },

    createWebSocketConnection(row) {
      const name = row.name
      const webSocketUrl = `ws://localhost:8333/myWs/${name}`

      const webSocket = new WebSocket(webSocketUrl)
      webSocket.onmessage = event => this.handleWebSocketMessage(event, row)
      // webSocket.onmessage = event => setTimeout(() => {
      //     this.handleWebSocketMessage(event, row);
      // },this.reconnectInterval);

      webSocket.onclose = event => setTimeout(() => {
        this.createWebSocketConnection(row)
      }, this.reconnectInterval)

      // 存储 WebSocket 对象到行数据中
      row.webSocket = webSocket
    },
    refreshChannel(row) {
      const name = row.name
      // 关闭旧的 WebSocket 连接
      if (row.webSocket) {
        row.webSocket.close()
      }
      // 创建新的 WebSocket 连接
      const webSocketUrl = `ws://localhost:8333/myWs/${name}`
      const newWebSocket = new WebSocket(webSocketUrl)
      newWebSocket.onmessage = event => this.handleWebSocketMessage(event, row)

      // 更新行数据中的 WebSocket 对象
      row.webSocket = newWebSocket
    },
    openFullscreen(row, index) {
      const imgElement = this.$refs[`videoImage_${row.name}`]
      if (imgElement.requestFullscreen) {
        imgElement.requestFullscreen()
      } else if (imgElement.mozRequestFullScreen) { // Firefox
        imgElement.mozRequestFullScreen()
      } else if (imgElement.webkitRequestFullscreen || imgElement.webkitEnterFullscreen) { // Chrome and Safari
        if (imgElement.webkitRequestFullscreen) {
          imgElement.webkitRequestFullscreen()
        } else {
          imgElement.webkitEnterFullscreen() // Older versions of Safari
        }
      } else if (imgElement.msRequestFullscreen) { // IE/Edge
        imgElement.msRequestFullscreen()
      }
    },
    goToVideoPage() {
      this.$router.push('/control')
    }
  }
}
</script>
