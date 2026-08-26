<script setup lang="ts">
import type { Permission } from '~/types/role'
import {
  APPLICATION_DOMAIN_DESCRIPTIONS,
  APPLICATION_DOMAIN_LABELS,
  APPLICATION_DOMAIN_ORDER,
  type ApplicationDomain,
  getPermissionApplicationDomain,
} from '~/constants/application-domains'
import {
  PERMISSION_CATEGORY_LABELS,
  PERMISSION_CATEGORY_SECTION_TITLES,
  formatPermissionDisplayName,
  groupRadicacionPermissions,
  permissionMatchesSearchQuery,
  sortPermissionCategoryKeys,
} from '~/constants/permission-labels'

const selectedPermissions = defineModel<string[]>({ required: true })

const props = withDefaults(defineProps<{
  permissions: Permission[]
  loading?: boolean
  visibleDomains?: ApplicationDomain[] | null
}>(), {
  loading: false,
  visibleDomains: null,
})

const permissionSearch = ref('')
const openCategories = ref<Record<string, boolean>>({})
const activeDomainTab = ref<ApplicationDomain>('creditos')

const groupedPermissions = computed(() => {
  const groups: Record<string, Permission[]> = {}
  for (const permission of props.permissions) {
    const category = permission.name.split('_')[0] ?? 'otros'
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(permission)
  }

  return groups
})

function categoryDomain(category: string): ApplicationDomain {
  return getPermissionApplicationDomain(category)
}

function matchesSearch(
  permission: Permission,
  categoryKey: string,
  subgroupLabel?: string,
): boolean {
  return permissionMatchesSearchQuery(permission.name, permissionSearch.value, {
    categoryKey,
    subgroupLabel,
  })
}

const filteredGroupedPermissions = computed(() => {
  const groups: Record<string, Permission[]> = {}
  for (const [category, list] of Object.entries(groupedPermissions.value)) {
    const filtered = list.filter(permission => matchesSearch(permission, category))
    if (filtered.length > 0) {
      groups[category] = filtered
    }
  }

  return groups
})

const filteredRadicacionSubgroups = computed(() =>
  groupRadicacionPermissions(groupedPermissions.value.radicacion ?? [])
    .map(subgroup => ({
      ...subgroup,
      items: subgroup.items.filter(permission =>
        matchesSearch(permission, 'radicacion', subgroup.label),
      ),
    }))
    .filter(subgroup => subgroup.items.length > 0),
)

const visibleCategoryKeys = computed(() =>
  sortPermissionCategoryKeys(Object.keys(filteredGroupedPermissions.value)),
)

function visibleCategoryKeysForDomain(domain: ApplicationDomain): string[] {
  return visibleCategoryKeys.value.filter((category) => {
    if (categoryDomain(category) !== domain) {
      return false
    }

    if (props.visibleDomains && !props.visibleDomains.includes(domain)) {
      return false
    }

    return true
  })
}

const visibleDomainTabs = computed(() => {
  if (!props.visibleDomains || props.visibleDomains.length === 0) {
    return APPLICATION_DOMAIN_ORDER
  }

  return APPLICATION_DOMAIN_ORDER.filter(domain => props.visibleDomains?.includes(domain))
})

const domainTabCounts = computed(() => {
  const counts = Object.fromEntries(
    APPLICATION_DOMAIN_ORDER.map(domain => [domain, { selected: 0, total: 0 }]),
  ) as Record<ApplicationDomain, { selected: number, total: number }>

  for (const category of Object.keys(groupedPermissions.value)) {
    const domain = categoryDomain(category)
    const list = groupedPermissions.value[category] ?? []
    counts[domain].total += list.length
    counts[domain].selected += list.filter(permission =>
      selectedPermissions.value.includes(permission.name),
    ).length
  }

  return counts
})

const hasSearchQuery = computed(() => permissionSearch.value.trim().length > 0)

const activeDomainHasResults = computed(() =>
  visibleCategoryKeysForDomain(activeDomainTab.value).length > 0,
)

watch(hasSearchQuery, (searching) => {
  if (!searching) {
    return
  }

  const firstWithResults = APPLICATION_DOMAIN_ORDER.find(
    domain => visibleCategoryKeysForDomain(domain).length > 0,
  )

  if (firstWithResults) {
    activeDomainTab.value = firstWithResults
  }
})

const getCategoryLabel = (key: string) =>
  PERMISSION_CATEGORY_SECTION_TITLES[key] ?? PERMISSION_CATEGORY_LABELS[key] ?? key

function isCategoryOpen(category: string): boolean {
  if (hasSearchQuery.value) {
    return true
  }

  return openCategories.value[category] ?? true
}

function setCategoryOpen(category: string, open: boolean) {
  openCategories.value = { ...openCategories.value, [category]: open }
}

function collapseAll() {
  openCategories.value = Object.fromEntries(
    Object.keys(groupedPermissions.value).map(category => [category, false]),
  )
}

function clearSearch() {
  permissionSearch.value = ''
}

function togglePermission(name: string, checked: boolean) {
  if (checked) {
    if (!selectedPermissions.value.includes(name)) {
      selectedPermissions.value = [...selectedPermissions.value, name]
    }
    return
  }

  selectedPermissions.value = selectedPermissions.value.filter(permission => permission !== name)
}

function permissionsForCategory(category: string): Permission[] {
  if (category === 'radicacion' && hasSearchQuery.value) {
    return filteredRadicacionSubgroups.value.flatMap(subgroup => subgroup.items)
  }

  return filteredGroupedPermissions.value[category] ?? []
}

function toggleCategory(category: string) {
  const list = permissionsForCategory(category)
  const allSelected = list.every(permission => selectedPermissions.value.includes(permission.name))
  if (allSelected) {
    selectedPermissions.value = selectedPermissions.value.filter(
      name => !list.some(permission => permission.name === name),
    )
    return
  }

  const toAdd = list
    .filter(permission => !selectedPermissions.value.includes(permission.name))
    .map(permission => permission.name)
  selectedPermissions.value = [...selectedPermissions.value, ...toAdd]
}

function selectedCountForCategory(category: string): number {
  return permissionsForCategory(category).filter(permission =>
    selectedPermissions.value.includes(permission.name),
  ).length
}

function totalCountForCategory(category: string): number {
  return permissionsForCategory(category).length
}

function isCategoryFullySelected(category: string): boolean {
  const list = permissionsForCategory(category)
  return list.length > 0 && list.every(permission => selectedPermissions.value.includes(permission.name))
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="relative min-w-0 flex-1">
        <Icon
          name="i-lucide-search"
          class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          v-model="permissionSearch"
          type="search"
          placeholder="Buscar por palabras (ej. anular ventanilla)…"
          class="pr-9 pl-9"
          autocomplete="off"
        />
        <Button
          v-if="hasSearchQuery"
          type="button"
          variant="ghost"
          size="icon"
          class="absolute top-1/2 right-1 size-7 -translate-y-1/2"
          aria-label="Limpiar búsqueda"
          @click="clearSearch"
        >
          <Icon name="i-lucide-x" class="size-4" />
        </Button>
      </div>
      <Button type="button" variant="outline" size="sm" class="shrink-0" @click="collapseAll">
        <Icon name="i-lucide-chevrons-up-down" class="mr-2 size-4" />
        Contraer todo
      </Button>
    </div>

    <p v-if="hasSearchQuery" class="text-muted-foreground text-sm">
      Coincidencias por palabras (en cualquier orden) dentro de cada sección. {{ visibleCategoryKeys.length }} sección(es) con resultados.
    </p>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <Icon name="i-lucide-loader-2" class="size-6 animate-spin" />
    </div>

    <div v-else class="space-y-4">
      <Tabs v-model="activeDomainTab" class="gap-4">
        <TabsList class="grid h-auto w-full grid-cols-1 gap-1 sm:grid-cols-3">
          <TabsTrigger
            v-for="domain in visibleDomainTabs"
            :key="domain"
            :value="domain"
            class="h-auto min-h-10 flex-col items-start gap-0.5 px-3 py-2 text-left sm:items-center sm:text-center"
          >
            <span class="font-medium">{{ APPLICATION_DOMAIN_LABELS[domain] }}</span>
            <span class="text-xs text-muted-foreground">
              {{ domainTabCounts[domain].selected }}/{{ domainTabCounts[domain].total }}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent
          v-for="domain in visibleDomainTabs"
          :key="domain"
          :value="domain"
          class="space-y-3"
        >
          <p class="text-sm text-muted-foreground">
            {{ APPLICATION_DOMAIN_DESCRIPTIONS[domain] }}
          </p>

          <div class="space-y-2">
            <Collapsible
              v-for="category in visibleCategoryKeysForDomain(domain)"
              :key="category"
              :open="isCategoryOpen(category)"
              class="group/perm rounded-lg border"
              @update:open="(open) => setCategoryOpen(category, open)"
            >
              <div class="flex items-center justify-between rounded-t-lg bg-muted/50 px-4 py-2">
                <CollapsibleTrigger as-child>
                  <button
                    type="button"
                    class="flex w-full items-center gap-2 text-left font-semibold hover:opacity-80"
                  >
                    <Icon
                      name="i-lucide-chevron-down"
                      class="size-4 transition-transform duration-200 group-data-[state=open]/perm:rotate-180"
                    />
                    {{ getCategoryLabel(category) }}
                    <Badge variant="secondary" class="ml-2">
                      {{ selectedCountForCategory(category) }}/{{ totalCountForCategory(category) }}
                    </Badge>
                  </button>
                </CollapsibleTrigger>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  @click.stop="toggleCategory(category)"
                >
                  {{ isCategoryFullySelected(category) ? 'Deseleccionar' : 'Seleccionar' }} todos
                </Button>
              </div>
              <CollapsibleContent>
                <div v-if="category === 'radicacion'" class="divide-y border-t">
                  <div
                    v-for="sub in filteredRadicacionSubgroups"
                    :key="sub.key"
                    class="px-4 py-3"
                  >
                    <p class="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {{ sub.label }}
                    </p>
                    <div class="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                      <div
                        v-for="permission in sub.items"
                        :key="permission.id"
                        class="flex items-center space-x-2"
                      >
                        <Checkbox
                          :id="`permission-${permission.id}`"
                          :model-value="selectedPermissions.includes(permission.name)"
                          @update:model-value="(value: boolean | 'indeterminate') => togglePermission(permission.name, value === true)"
                        />
                        <Label :for="`permission-${permission.id}`" class="cursor-pointer text-sm font-normal">
                          {{ formatPermissionDisplayName(permission.name) }}
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else class="grid grid-cols-1 gap-2 border-t p-4 md:grid-cols-2 lg:grid-cols-3">
                  <div
                    v-for="permission in filteredGroupedPermissions[category] ?? []"
                    :key="permission.id"
                    class="flex items-center space-x-2"
                  >
                    <Checkbox
                      :id="`permission-${permission.id}`"
                      :model-value="selectedPermissions.includes(permission.name)"
                      @update:model-value="(value: boolean | 'indeterminate') => togglePermission(permission.name, value === true)"
                    />
                    <Label :for="`permission-${permission.id}`" class="cursor-pointer text-sm font-normal">
                      {{ formatPermissionDisplayName(permission.name) }}
                    </Label>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <p
              v-if="!activeDomainHasResults && permissions.length > 0"
              class="py-8 text-center text-muted-foreground"
            >
              <template v-if="hasSearchQuery">
                No se encontraron permisos para «{{ permissionSearch.trim() }}» en este módulo.
              </template>
              <template v-else>
                No hay permisos en este módulo.
              </template>
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <p
        v-if="!loading && visibleCategoryKeys.length === 0 && permissions.length > 0"
        class="py-4 text-center text-muted-foreground"
      >
        <template v-if="hasSearchQuery">
          No se encontraron permisos para «{{ permissionSearch.trim() }}».
        </template>
        <template v-else>
          No hay permisos disponibles.
        </template>
      </p>
    </div>
  </div>
</template>
