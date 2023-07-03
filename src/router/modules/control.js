/** When your routing table is too long, you can split it into small modules **/

import Layout from '@/layout'

const controlRouter = {
  path: '/Control',
  component: Layout,
  redirect: '/control/control-car',
  name: 'Control',
  meta: {
    title: 'Control',
    icon: 'control'
  },
  children: [
    {
      path: 'control-car',
      component: () => import('@/views/control/control'),
      name: 'ControlCar',
      meta: { title: 'Control Car' }
    }
  ]
}
export default controlRouter
