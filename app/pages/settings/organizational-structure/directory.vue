<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { OrgStaffListItem } from '~/types/org-structure'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_ver',
})

const { $api } = useNuxtApp()
const router = useRouter()

const q = ref('')
const debouncedQ = ref('')
let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(q, (v: string) => {
  if (debounceTimer)
    clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedQ.value = v.trim()
    pagination.value.current_page = 1
    fetchDirectory()
  }, 400)
})

const rows = ref<OrgStaffListItem[]>([])
const loading = ref(false)
const pagination = ref({
  current_page: 1,
  last_page: 1,
  per_page: 30,
  total: 0,
})

async function fetchDirectory() {
  loading.value = true
  try {
    const res = await $api<{
      data: OrgStaffListItem[]
      meta: typeof pagination.value
    }>('/organizational-structure/meta/directory', {
      query: {
        q: debouncedQ.value || undefined,
        page: pagination.value.current_page,
        per_page: pagination.value.per_page,
      },
    })
    rows.value = res.data
    pagination.value = res.meta
  } catch {
    toast.error('Error al cargar el directorio')
    rows.value = []
  } finally {
    loading.value = false
  }
}

function displayName(s: OrgStaffListItem): string {
  if (s.full_name)
    return s.full_name
  return [s.first_name, s.second_name, s.first_last_name, s.second_last_name].filter(Boolean).join(' ')
}

onMounted(() => {
  fetchDirectory()
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="space-y-1">
        <Button variant="ghost" size="sm" class="h-8 w-fit -ml-2 px-2" @click="router.push('/settings/organizational-structure')">
          <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
          Módulo
        </Button>
        <h2 class="text-2xl font-bold tracking-tight">
          Directorio institucional
        </h2>
      </div>

      <div class="w-full max-w-sm space-y-2">
        <Label for="q" class="sr-only">Buscar</Label>
        <Input
          id="q"
          v-model="q"
          placeholder="Nombre, cargo, área, correo…"
        />
      </div>

      <Card>
        <CardHeader class="gap-2">
          <CardTitle class="leading-snug">
            Cuadro de ubicación institucional
          </CardTitle>
          <CardDescription class="leading-relaxed">
            Funcionarios con asignación vigente: cargo, área, agencia y datos de contacto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="loading" class="flex justify-center py-12">
            <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
          <div v-else-if="rows.length === 0" class="py-12 text-center text-muted-foreground leading-relaxed">
            No hay funcionarios con ubicación vigente.
          </div>
          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Agencia</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Jefe inmediato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="s in rows" :key="s.id">
                <TableCell class="font-medium">
                  {{ displayName(s) }}
                </TableCell>
                <TableCell>{{ s.current_assignment?.org_position?.name ?? '—' }}</TableCell>
                <TableCell>{{ s.current_assignment?.org_unit?.name ?? '—' }}</TableCell>
                <TableCell>{{ s.current_assignment?.org_office?.name ?? '—' }}</TableCell>
                <TableCell class="text-sm">
                  <div v-if="s.email">
                    {{ s.email }}
                  </div>
                  <div v-if="s.phone || s.extension" class="text-muted-foreground">
                    <span v-if="s.phone">{{ s.phone }}</span>
                    <span v-if="s.extension"> · Ext. {{ s.extension }}</span>
                  </div>
                  <span v-if="!s.email && !s.phone && !s.extension">—</span>
                </TableCell>
                <TableCell class="text-sm">
                  {{
                    s.current_assignment?.immediate_supervisor_staff
                      ? `${s.current_assignment.immediate_supervisor_staff.first_name} ${s.current_assignment.immediate_supervisor_staff.first_last_name}`
                      : '—'
                  }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div v-if="pagination.last_page > 1" class="flex justify-center gap-2 border-t pt-6">
            <Button
              variant="outline"
              size="sm"
              :disabled="pagination.current_page <= 1 || loading"
              @click="pagination.current_page--; fetchDirectory()"
            >
              Anterior
            </Button>
            <span class="text-sm text-muted-foreground self-center">
              {{ pagination.current_page }} / {{ pagination.last_page }}
            </span>
            <Button
              variant="outline"
              size="sm"
              :disabled="pagination.current_page >= pagination.last_page || loading"
              @click="pagination.current_page++; fetchDirectory()"
            >
              Siguiente
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
