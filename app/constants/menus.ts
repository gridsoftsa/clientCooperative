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
      {
        title: 'Reportes',
        icon: 'i-lucide-chart-column',
        link: '/reportes',
        permission: 'reportes_ver',
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
    heading: 'Organización',
    items: [
      {
        title: 'Estructura',
        icon: 'i-lucide-file-text',
        permission: 'estructura_org_ver',
        children: [
          {
            title: 'Resumen',
            link: '/settings/organizational-structure',
            permission: 'estructura_org_ver',
          },
          {
            title: 'Agencias',
            link: '/settings/organizational-structure/offices',
            permission: 'estructura_org_ver',
          },
          {
            title: 'Áreas y dependencias',
            link: '/settings/organizational-structure/units',
            permission: 'estructura_org_ver',
          },
          {
            title: 'Cargos',
            link: '/settings/organizational-structure/positions',
            permission: 'estructura_org_ver',
          },
          {
            title: 'Funcionarios',
            link: '/settings/organizational-structure/staff',
            permission: 'estructura_org_ver',
          },
          {
            title: 'Directorio',
            link: '/settings/organizational-structure/directory',
            permission: 'estructura_org_ver',
          },
          {
            title: 'Organigrama',
            link: '/settings/organizational-structure/tree',
            permission: 'estructura_org_ver',
          },
        ],
      },
      {
        title: 'TRD y archivo',
        icon: 'i-lucide-archive',
        anyPermission: ['trd_catalogo_ver', 'trd_tablas_ver'],
        children: [
          {
            title: 'Resumen',
            link: '/settings/archival',
            anyPermission: ['trd_catalogo_ver', 'trd_tablas_ver'],
          },
          {
            title: 'Catálogo (series)',
            link: '/settings/archival/catalog/series',
            permission: 'trd_catalogo_ver',
          },
          {
            title: 'Tablas TRD',
            link: '/settings/archival/trd',
            permission: 'trd_tablas_ver',
          },
          {
            title: 'TRD vigente',
            link: '/settings/archival/trd/consult',
            permission: 'trd_tablas_ver',
          },
          {
            title: 'Reportes archivísticos',
            link: '/settings/archival/reports',
            anyPermission: ['trd_catalogo_ver', 'trd_tablas_ver', 'trd_reportes_ver'],
          },
          {
            title: 'Ciclo de vida',
            link: '/settings/archival/lifecycle',
            anyPermission: ['trd_ciclo_vida_ver', 'trd_tablas_ver', 'trd_catalogo_ver'],
          },
          {
            title: 'Disposición final',
            link: '/settings/archival/disposition',
            anyPermission: ['trd_disposicion_ver', 'trd_tablas_ver', 'trd_catalogo_ver'],
          },
          {
            title: 'Metadatos',
            link: '/settings/archival/metadata/schemas',
            permission: 'trd_metadatos_ver',
          },
          {
            title: 'Auditoría catálogo/TRD',
            link: '/settings/archival/audit',
            anyPermission: ['trd_auditoria_ver', 'auditoria_ver'],
          },
        ],
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
            permission: 'plantilla_score_ver',
          },
        ],
      },
      {
        title: 'Auditoría',
        icon: 'i-lucide-clipboard-list',
        link: '/audits',
        permission: 'auditoria_ver',
      },
      {
        title: 'Configuración',
        icon: 'i-lucide-settings',
        anyPermission: [
          'perfil_ver',
          'cuenta_ver',
          'apariencia_ver',
          'notificaciones_ver',
          'display_ver',
          'empresa_ver',
          'usuarios_ver',
          'sucursales_ver',
          'estructura_org_ver',
          'roles_ver',
        ],
        children: [
          {
            title: 'Datos personales',
            icon: 'i-lucide-user',
            link: '/settings/profile',
            permission: 'perfil_ver',
          },
          {
            title: 'Contraseña',
            icon: 'i-lucide-key',
            link: '/settings/account',
            permission: 'cuenta_ver',
          },
          {
            title: 'Apariencia',
            icon: 'i-lucide-palette',
            link: '/settings/appearance',
            permission: 'apariencia_ver',
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
            title: 'Agencias (sedes)',
            icon: 'i-lucide-building-2',
            link: '/settings/organizational-structure/offices',
            anyPermission: ['estructura_org_ver', 'sucursales_ver'],
          },
          {
            title: 'Roles',
            icon: 'i-lucide-shield-check',
            link: '/settings/roles',
            permission: 'roles_ver',
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
