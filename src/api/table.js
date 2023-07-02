import request from '@/utils/request'
export function getChannelList() {
  return request({
    url: 'http://localhost:8081/udp/getChannelList',
    method: 'get'
  })
}
