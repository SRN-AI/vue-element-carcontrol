import request from '@/utils/request'
export function getChannelList() {
  return request({
    url: '/udp/getChannelList',
    method: 'get'
  })
}
export function updateAllSwitch(status) {
  return request({
    url: '/udp/switch',
    method: 'get',
    params: { status }
  })
}
