<script setup lang="ts">
import type { Permission } from '~/types/role'
import {
  PERMISSION_CATEGORY_LABELS,
  PERMISSION_CATEGORY_SECTION_TITLES,
  formatPermissionDisplayName,
  groupRadicacionPermissions,
  sortPermissionCategoryKeys,
} from '~/constants/permission-labels'

const props = withDefaults(
  defineProps<{
    permissions: Permission[]
    loading?: boolean
  }>(),
  { loading: false },
)

const selected = defineModel<string[]>({ required: true })

const searchQuery = ref('')
const showOnlySelected = ref(false)

const normalizedSearch = computed(() => searchQuery.value.trim().toLowerCase())

function getCategoryLabel(key: string) {
  return PERMISSION_CATEGORY_SECTION_TITLES[key] ?? PERMISSION_CATEGORY_LABELS[key] ?? key
}

function permissionMatchesSearch(permission: Permission): boolean {
  const q = normalizedSearch.value
  if (!q) {
    return true
  }

  const category = permission.name.split('_')[0] ?? ''
  const haystack = [
    permission.name,
    formatPermissionDisplayName(permission.name),
    getCategoryLabel(category),
    category,
  ].join(' ').toLowerCase()

  return haystack.includes(q)
}

const visiblePermissions = computed(() => {
  let list = props.permissions

  if (showOnlySelected.value) {
    const selectedSet = new Set(selected.value)
    list = list.filter(p => selectedSet.has(p.name))
  }

  if (normalizedSearch.value) {
    list = list.filter(permissionMatchesSearch)
  }

  return list
})

const groupedPermissions = computed(() => {
  const groups: Record<string, Permission[]> = {}
  for (const p of visiblePermissions.value) {
    const category = p.name.split('_')[0] ?? 'otros'
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(p)
  }
  return groups
})

const orderedCategoryKeys = computed(() =>
  sortPermissionCategoryKeys(Object.keys(groupedPermissions.value)),
)

const radicacionSubgroups = computed(() =>
  groupRadicacionPermissions(groupedPermissions.value.radicacion ?? []),
)

const openCategories = ref<Record<string, boolean>>({})

watch([normalizedSearch, showOnlySelected], () => {
  if (!normalizedSearch.value && !showOnlySelected.value) {
    return
  }
  openCategories.value = Object.fromEntries(
    orderedCategoryKeys.value.map(category => [category, true]),
  )
})

function setCategoryOpen(category: string, open: boolean) {
  openCategories.value = { ...openCategories.value, [category]: open }
}

function collapseAll() {
  openCategories.value = Object.fromEntries(
    orderedCategoryKeys.value.map(category => [category, false]),
  )
}

function expandAll() {
  openCategories.value = Object.fromEntries(
    orderedCategoryKeys.value.map(category => [category, true]),
  )
}

function togglePermission(name: string, checked: boolean) {
  if (checked) {
    if (!selected.value.includes(name)) {
      selected.value = [...selected.value, name]
    }
    return
  }
  selected.value = selected.value.filter(p => p !== name)
}

function toggleCategory(category: string) {
  const list = groupedPermissions.value[category] ?? []
  const allSelected = list.every(p => selected.value.includes(p.name))
  if (allSelected) {
    selected.value = selected.value.filter(
      p => !list.some(item => item.name === p),
    )
    return
  }
  const toAdd = list
    .filter(p => !selected.value.includes(p.name))
    .map(p => p.name)
  selected.value = [...selected.value, ...toAdd]
}

function countSelectedInList(list: { name: string }[]): number {
  return list.filter(p => selected.value.includes(p.name)).length
}

function clearFilters() {
  searchQuery.value = ''
  showOnlySelected.value = false
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:flex-wrap sm:items-end">
      <div class="min-w-0 flex-1 space-y-2 sm:min-w-[240px]">
        <Label for="permission-search">Buscar permiso</Label>
        <div class="relative">
          <Icon
            name="i-lucide-search"
            class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="permission-search"
            v-model="searchQuery"
            placeholder="Ej: usuarios, radicación, crear, ver reportes…"
            class="pl-9"
            :disabled="loading"
          />
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          :variant="showOnlySelected ? 'default' : 'outline'"
          @click="showOnlySelected = !showOnlySelected"
        >
          <Icon name="i-lucide-filter" class="mr-1.5 size-4" />
          Solo seleccionados
        </Button>
        <Button
          v-if="searchQuery || showOnlySelected"
          type="button"
          size="sm"
          variant="ghost"
          @click="clearFilters"
        >
          Limpiar filtros
        </Button>
        <Button type="button" variant="outline" size="sm" @click="expandAll">
          <Icon name="i-lucide-chevrons-down" class="mr-1.5 size-4" />
          Expandir
        </Button>
        <Button type="button" variant="outline" size="sm" @click="collapseAll">
          <Icon name="i-lucide-chevrons-up" class="mr-1.5 size-4" />
          Contraer
        </Button>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <Badge variant="secondary" class="tabular-nums">
        {{ selected.length }} seleccionados
      </Badge>
      <span v-if="normalizedSearch || showOnlySelected">
        Mostrando {{ visiblePermissions.length }} de {{ permissions.length }} permisos
      </span>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-10">
      <Icon name="i-lucide-loader-2" class="size-6 animate-spin text-muted-foreground" />
    </div>

    <div v-else-if="visiblePermissions.length === 0" class="rounded-lg border border-dashed py-10 text-center">
      <p class="text-sm font-medium text-foreground">
        No hay permisos que coincidan con tu búsqueda
      </p>
      <p class="mt-1 text-sm text-muted-foreground">
        Prueba con otra palabra o limpia los filtros.
      </p>
      <Button type="button" variant="outline" size="sm" class="mt-4" @click="clearFilters">
        Limpiar búsqueda
      </Button>
    </div>

    <div v-else class="space-y-2">
      <Collapsible
        v-for="category in orderedCategoryKeys"
        :key="category"
        :open="openCategories[category] ?? Boolean(normalizedSearch)"
        class="group/perm rounded-lg border"
        @update:open="(v: boolean) => setCategoryOpen(category, v)"
      >
        <div class="flex items-center justify-between rounded-t-lg bg-muted/50 px-4 py-2">
          <CollapsibleTrigger as-child>
            <button
              type="button"
              class="flex min-w-0 flex-1 items-center gap-2 text-left font-semibold hover:opacity-80"
            >
              <Icon
                name="i-lucide-chevron-down"
                class="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/perm:rotate-180"
              />
              <span class="min-w-0 truncate">{{ getCategoryLabel(category) }}</span>
              <Badge variant="secondary" class="ml-1 shrink-0 tabular-nums">
                {{ countSelectedInList(groupedPermissions[category] ?? []) }}/{{ (groupedPermissions[category] ?? []).length }}
              </Badge>
            </button>
          </CollapsibleTrigger>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            @click.stop="toggleCategory(category)"
          >
            {{ (groupedPermissions[category] ?? []).every(p => selected.includes(p.name)) ? 'Quitar todos' : 'Marcar todos' }}
          </Button>
        </div>

        <CollapsibleContent>
          <div v-if="category === 'radicacion'" class="divide-y border-t">
            <div
              v-for="sub in radicacionSubgroups"
              :key="sub.key"
              class="px-4 py-3"
            >
              <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {{ sub.label }}
                </p>
                <Badge variant="outline" class="tabular-nums text-xs font-normal">
                  {{ countSelectedInList(sub.items) }}/{{ sub.items.length }}
                </Badge>
              </div>
              <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div
                  v-for="p in sub.items"
                  :key="p.id"
                  class="flex items-start gap-2 rounded-md border border-transparent px-2 py-1.5 hover:border-border hover:bg-muted/30"
                >
                  <Checkbox
                    :id="`permission-${p.id}`"
                    class="mt-0.5"
                    :model-value="selected.includes(p.name)"
                    @update:model-value="(v: boolean | 'indeterminate') => togglePermission(p.name, v === true)"
                  />
                  <Label :for="`permission-${p.id}`" class="min-w-0 cursor-pointer space-y-0.5 font-normal">
                    <span class="block text-sm leading-snug text-foreground">
                      {{ formatPermissionDisplayName(p.name) }}
                    </span>
                    <span class="block text-xs text-muted-foreground">
                      {{ p.name }}
                    </span>
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="grid grid-cols-1 gap-3 border-t p-4 md:grid-cols-2 xl:grid-cols-3">
            <div
              v-for="p in groupedPermissions[category] ?? []"
              :key="p.id"
              class="flex items-start gap-2 rounded-md border border-transparent px-2 py-1.5 hover:border-border hover:bg-muted/30"
            >
              <Checkbox
                :id="`permission-${p.id}`"
                class="mt-0.5"
                :model-value="selected.includes(p.name)"
                @update:model-value="(v: boolean | 'indeterminate') => togglePermission(p.name, v === true)"
              />
              <Label :for="`permission-${p.id}`" class="min-w-0 cursor-pointer space-y-0.5 font-normal">
                <span class="block text-sm leading-snug text-foreground">
                  {{ formatPermissionDisplayName(p.name) }}
                </span>
                <span class="block text-xs text-muted-foreground">
                  {{ p.name }}
                </span>
              </Label>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  </div>
</template>
