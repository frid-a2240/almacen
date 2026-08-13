import InventoryIcon from '@mui/icons-material/Inventory2Outlined'
import WarehouseIcon from '@mui/icons-material/WarehouseOutlined'
import PeopleIcon from '@mui/icons-material/PeopleAltOutlined'
import LocalShippingIcon from '@mui/icons-material/LocalShippingOutlined'
import CategoryIcon from '@mui/icons-material/CategoryOutlined'
import HomeWorkIcon from '@mui/icons-material/HomeWorkOutlined'
import AssignmentIndIcon from '@mui/icons-material/AssignmentIndOutlined'

// Mismo orden y agrupación que Presentation.MenuEntries en el AppSheet original.
export const VIEWS = [
  { name: 'PRODUCTOS', path: '/productos', icon: InventoryIcon },
  { name: 'STOCK INVENTORY', path: '/stock-inventory', icon: WarehouseIcon },
  { name: 'EMPLEADOS', path: '/empleados', icon: PeopleIcon },
  { name: 'CONTROL DE RESGUARDO', path: '/control-de-resguardo', icon: LocalShippingIcon },
  { name: 'CLASE FAMILIA', path: '/clase-familia', icon: CategoryIcon },
  { name: 'DEPARTAMENTO', path: '/departamento', icon: HomeWorkIcon },
  { name: 'REPORTE DE SALIDAS', path: '/reporte-de-salidas', icon: AssignmentIndIcon },
]
