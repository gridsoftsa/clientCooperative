<script setup lang="ts">
import type { RoleAssignedUser } from '~/types/role'
import { roleAssignedUserLabel } from '~/constants/role-labels'
import { DEFAULT_LIST_PAGE_SIZE } from '~/constants/list-pagination'

const props = withDefaults(defineProps<{
  users?: RoleAssignedUser[]
}>(), {
  users: () => [],
})

const searchQuery = ref('')
const page = ref(1)
const perPage = ref(DEFAULT_LIST_PAGE_SIZE)

const filteredUsers = computed(() => {
  const needle = searchQuery.value.trim().toLowerCase()
  const rows = props.users

  if (!needle) {
    return rows
  }

  return rows.filter((user) => {
    const label = roleAssignedUserLabel(user).toLowerCase()
    const email = user.email.toLowerCase()

    return label.includes(needle) || email.includes(needle)
  })
})

const lastPage = computed(() => Math.max(1, Math.ceil(filteredUsers.value.length / perPage.value)))

const pageRows = computed(() => {
  const start = (page.value - 1) * perPage.value

  return filteredUsers.value.slice(start, start + perPage.value)
})

watch([searchQuery, () => props.users], () => {
  page.value = 1
})

watch(lastPage, (value) => {
  if (page.value > value) {
    page.value = value
  }
})

function updatePage(nextPage: number): void {
  page.value = nextPage
}

function updatePerPage(size: number): void {
  perPage.value = size
  page.value = 1
}
</script>

<template>
  <div class="space-y-4">
    <div class="relative max-w-md">
      <Icon name="i-lucide-search" class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        v-model="searchQuery"
        placeholder="Buscar por nombre o correo…"
        class="pl-9"
      />
    </div>

    <p v-if="filteredUsers.length === 0" class="text-sm text-muted-foreground">
      {{ users.length === 0 ? 'Ningún usuario tiene este rol.' : 'Ningún usuario coincide con la búsqueda.' }}
    </p>

    <div v-else class="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Correo</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="user in pageRows" :key="user.id">
            <TableCell class="font-medium">
              {{ roleAssignedUserLabel(user) }}
            </TableCell>
            <TableCell class="text-muted-foreground">
              {{ user.email }}
            </TableCell>
            <TableCell>
              <Badge :variant="user.is_active ? 'secondary' : 'outline'">
                {{ user.is_active ? 'Activo' : 'Cuenta inactiva' }}
              </Badge>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <ListPaginationBar
      v-if="filteredUsers.length > 0"
      :page="page"
      :last-page="lastPage"
      :per-page="perPage"
      :total="filteredUsers.length"
      item-label="usuarios"
      @update:page="updatePage"
      @update:per-page="updatePerPage"
    />
  </div>
</template>
