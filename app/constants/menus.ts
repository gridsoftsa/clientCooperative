import type { NavMenu, NavMenuItems } from '~/types/nav'

export const navMenu: NavMenu[] = [
  {
    heading: 'General',
    items: [
      {
        title: 'Dashboard',
        icon: 'i-lucide-home',
        link: '/',
        permission: 'dashboard_ver',
      },
      /* {
        title: 'Email',
        icon: 'i-lucide-mail',
        link: '/email',
      },
      {
        title: 'Tasks',
        icon: 'i-lucide-calendar-check-2',
        link: '/tasks',
      }, */
    ],
  },
  {
    heading: 'Crédito',
    items: [
      {
        title: 'Radicación',
        icon: 'i-lucide-file-text',
        link: '/radicacion',
        permission: 'radicacion_ver',
      },
      {
        title: 'Solicitantes',
        icon: 'i-lucide-user-check',
        link: '/solicitantes',
        permission: 'solicitantes_ver',
      },
    ],
  },
  {
    heading: 'Sistema',
    items: [
      {
        title: 'Parametrización',
        icon: 'i-lucide-settings-2',
        children: [
          {
            title: 'Plantillas',
            icon: 'i-lucide-layout-template',
            link: '/parametrizacion/plantillas',
            permission: 'plantillas_ver',
          },
          {
            title: 'Radicación',
            icon: 'i-lucide-file-text',
            link: '/parametrizacion/radicacion',
            permission: 'plantillas_ver',
          },
          {
            title: 'Plantilla Score',
            icon: 'i-lucide-file-spreadsheet',
            link: '/parametrizacion/plantilla-score',
            permission: 'plantillas_ver',
          },
        ],
      },
      {
        title: 'Configuración',
        icon: 'i-lucide-settings',
        anyPermission: [
          'settings_ver',
          'empresa_ver',
          'usuarios_ver',
          'sucursales_ver',
          'roles_ver',
          'admin_acceso',
        ],
        children: [
          {
            title: 'Perfil',
            icon: 'i-lucide-user',
            link: '/settings/profile',
            permission: 'settings_ver',
          },
          {
            title: 'Cuenta',
            icon: 'i-lucide-id-card',
            link: '/settings/account',
            permission: 'settings_ver',
          },
          {
            title: 'Apariencia',
            icon: 'i-lucide-palette',
            link: '/settings/appearance',
            permission: 'settings_ver',
          },
          {
            title: 'Notificaciones',
            icon: 'i-lucide-bell',
            link: '/settings/notifications',
            permission: 'settings_ver',
          },
          {
            title: 'Pantalla',
            icon: 'i-lucide-monitor',
            link: '/settings/display',
            permission: 'settings_ver',
          },
          {
            title: 'Empresa principal',
            icon: 'i-lucide-building',
            link: '/settings/company',
            permission: 'empresa_ver',
          },
          {
            title: 'Usuarios',
            icon: 'i-lucide-users',
            link: '/settings/users',
            permission: 'usuarios_ver',
          },
          {
            title: 'Sucursales',
            icon: 'i-lucide-building-2',
            link: '/settings/sucursales',
            permission: 'sucursales_ver',
          },
          {
            title: 'Roles',
            icon: 'i-lucide-shield-check',
            link: '/settings/roles',
            permission: 'roles_ver',
          },
          {
            title: 'Auditoría',
            icon: 'i-lucide-clipboard-list',
            link: '/settings/audit',
            permission: 'admin_acceso',
          },
        ],
      },
    ],
  },
  /* {
    heading: 'Apps',
    items: [
      {
        title: 'Kanban Board',
        icon: 'i-lucide-kanban',
        link: '/kanban',
        new: true,
      },
    ],
  }, */
  /* {
    heading: 'Components',
    items: [
      {
        title: 'Components',
        icon: 'i-lucide-component',
        children: [
          {
            title: 'Accordion',
            icon: 'i-lucide-circle',
            link: '/components/accordion',
          },
          {
            title: 'Alert',
            icon: 'i-lucide-circle',
            link: '/components/alert',
          },
          {
            title: 'Alert Dialog',
            icon: 'i-lucide-circle',
            link: '/components/alert-dialog',
          },
          {
            title: 'Aspect Ratio',
            icon: 'i-lucide-circle',
            link: '/components/aspect-ratio',
          },
          {
            title: 'Avatar',
            icon: 'i-lucide-circle',
            link: '/components/avatar',
          },
          {
            title: 'Badge',
            icon: 'i-lucide-circle',
            link: '/components/badge',
          },
          {
            title: 'Breadcrumb',
            icon: 'i-lucide-circle',
            link: '/components/breadcrumb',
          },
          {
            title: 'Button',
            icon: 'i-lucide-circle',
            link: '/components/button',
          },
          {
            title: 'Calendar',
            icon: 'i-lucide-circle',
            link: '/components/calendar',
          },
          {
            title: 'Card',
            icon: 'i-lucide-circle',
            link: '/components/card',
          },
          {
            title: 'Carousel',
            icon: 'i-lucide-circle',
            link: '/components/carousel',
          },
          {
            title: 'Checkbox',
            icon: 'i-lucide-circle',
            link: '/components/checkbox',
          },
          {
            title: 'Collapsible',
            icon: 'i-lucide-circle',
            link: '/components/collapsible',
          },
          {
            title: 'Combobox',
            icon: 'i-lucide-circle',
            link: '/components/combobox',
          },
          {
            title: 'Command',
            icon: 'i-lucide-circle',
            link: '/components/command',
          },
          {
            title: 'Context Menu',
            icon: 'i-lucide-circle',
            link: '/components/context-menu',
          },
          {
            title: 'Dialog',
            icon: 'i-lucide-circle',
            link: '/components/dialog',
          },
          {
            title: 'Drawer',
            icon: 'i-lucide-circle',
            link: '/components/drawer',
          },
          {
            title: 'Dropdown Menu',
            icon: 'i-lucide-circle',
            link: '/components/dropdown-menu',
          },
          {
            title: 'Form',
            icon: 'i-lucide-circle',
            link: '/components/form',
          },
          {
            title: 'Hover Card',
            icon: 'i-lucide-circle',
            link: '/components/hover-card',
          },
          {
            title: 'Input',
            icon: 'i-lucide-circle',
            link: '/components/input',
          },
          {
            title: 'Item',
            icon: 'i-lucide-circle',
            link: '/components/item',
            new: true,
          },
          {
            title: 'kbd',
            icon: 'i-lucide-circle',
            link: '/components/kbd',
            new: true,
          },
          {
            title: 'Label',
            icon: 'i-lucide-circle',
            link: '/components/label',
          },
          {
            title: 'Menubar',
            icon: 'i-lucide-circle',
            link: '/components/menubar',
          },
          {
            title: 'Navigation Menu',
            icon: 'i-lucide-circle',
            link: '/components/navigation-menu',
          },
          {
            title: 'Number Field',
            icon: 'i-lucide-circle',
            link: '/components/number-field',
          },
          {
            title: 'Pagination',
            icon: 'i-lucide-circle',
            link: '/components/pagination',
          },
          {
            title: 'PIN Input',
            icon: 'i-lucide-circle',
            link: '/components/pin-input',
          },
          {
            title: 'Popover',
            icon: 'i-lucide-circle',
            link: '/components/popover',
          },
          {
            title: 'Progress',
            icon: 'i-lucide-circle',
            link: '/components/progress',
          },
          {
            title: 'Radio Group',
            icon: 'i-lucide-circle',
            link: '/components/radio-group',
          },
          {
            title: 'Range Calendar',
            icon: 'i-lucide-circle',
            link: '/components/range-calendar',
          },
          {
            title: 'Resizable',
            icon: 'i-lucide-circle',
            link: '/components/resizable',
          },
          {
            title: 'Scroll Area',
            icon: 'i-lucide-circle',
            link: '/components/scroll-area',
          },
          {
            title: 'Select',
            icon: 'i-lucide-circle',
            link: '/components/select',
          },
          {
            title: 'Separator',
            icon: 'i-lucide-circle',
            link: '/components/separator',
          },
          {
            title: 'Sheet',
            icon: 'i-lucide-circle',
            link: '/components/sheet',
          },
          {
            title: 'Skeleton',
            icon: 'i-lucide-circle',
            link: '/components/skeleton',
          },
          {
            title: 'Slider',
            icon: 'i-lucide-circle',
            link: '/components/slider',
          },
          {
            title: 'Sonner',
            icon: 'i-lucide-circle',
            link: '/components/sonner',
          },
          {
            title: 'Stepper',
            icon: 'i-lucide-circle',
            link: '/components/stepper',
          },
          {
            title: 'Switch',
            icon: 'i-lucide-circle',
            link: '/components/switch',
          },
          {
            title: 'Table',
            icon: 'i-lucide-circle',
            link: '/components/table',
          },
          {
            title: 'Tabs',
            icon: 'i-lucide-circle',
            link: '/components/tabs',
          },
          {
            title: 'Tags Input',
            icon: 'i-lucide-circle',
            link: '/components/tags-input',
          },
          {
            title: 'Textarea',
            icon: 'i-lucide-circle',
            link: '/components/textarea',
          },
          {
            title: 'Toast',
            icon: 'i-lucide-circle',
            link: '/components/toast',
          },
          {
            title: 'Toggle',
            icon: 'i-lucide-circle',
            link: '/components/toggle',
          },
          {
            title: 'Toggle Group',
            icon: 'i-lucide-circle',
            link: '/components/toggle-group',
          },
          {
            title: 'Tooltip',
            icon: 'i-lucide-circle',
            link: '/components/tooltip',
          },
        ],
      },
    ],
  }, */
]

export const navMenuBottom: NavMenuItems = [
  /* {
    title: 'Help & Support',
    icon: 'i-lucide-circle-help',
    link: 'https://github.com/dianprata/nuxt-shadcn-dashboard',
  },
  {
    title: 'Feedback',
    icon: 'i-lucide-send',
    link: 'https://github.com/dianprata/nuxt-shadcn-dashboard',
  }, */
]
