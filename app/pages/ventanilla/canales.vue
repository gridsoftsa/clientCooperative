<script setup lang="ts">
import { toast } from 'vue-sonner'
import type {
  VentanillaCatalogData,
  VentanillaClassificationRuleRow,
  VentanillaEmailAccountRow,
} from '~/types/ventanilla'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'ventanilla_sla_configurar',
})

const api = useVentanillaApi()
const loading = ref(true)
const saving = ref(false)
const testing = ref(false)
const fetching = ref(false)
const activeTab = ref('email')
const catalog = ref<VentanillaCatalogData | null>(null)
const emailAccount = ref<VentanillaEmailAccountRow | null>(null)
const emailPassword = ref('')
const rules = ref<VentanillaClassificationRuleRow[]>([])
const showRuleForm = ref(false)
const editingRuleId = ref<number | null>(null)
const ruleForm = ref({
  name: '',
  priority: 100,
  source: 'all',
  match_field: 'subject',
  match_mode: 'contains',
  pattern: '',
  functional_type_key: '',
  filing_type: 'incoming',
  is_active: true,
})

onMounted(load)

async function load() {
  loading.value = true
  try {
    const [account, rulesData, catalogData] = await Promise.all([
      api.fetchEmailAccount(),
      api.fetchClassificationRules(),
      api.fetchCatalog().catch(() => null),
    ])
    emailAccount.value = account
    rules.value = rulesData
    catalog.value = catalogData
    emailPassword.value = ''
  } catch {
    toast.error('No se pudo cargar la configuración de canales')
  } finally {
    loading.value = false
  }
}

async function saveEmailAccount() {
  if (!emailAccount.value) {
    return
  }
  saving.value = true
  try {
    const body: Record<string, unknown> = {
      name: emailAccount.value.name,
      host: emailAccount.value.host,
      port: emailAccount.value.port,
      encryption: emailAccount.value.encryption,
      username: emailAccount.value.username,
      mailbox: emailAccount.value.mailbox,
      is_active: emailAccount.value.is_active,
    }
    if (emailPassword.value.trim()) {
      body.password = emailPassword.value.trim()
    }
    emailAccount.value = await api.updateEmailAccount(body)
    emailPassword.value = ''
    toast.success('Cuenta de correo guardada')
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toast.error(err.data?.message ?? 'No se pudo guardar la cuenta')
  } finally {
    saving.value = false
  }
}

async function testConnection() {
  testing.value = true
  try {
    const message = await api.testEmailAccountConnection()
    toast.success(message)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toast.error(err.data?.message ?? 'No se pudo conectar')
  } finally {
    testing.value = false
  }
}

async function fetchNow() {
  fetching.value = true
  try {
    const result = await api.fetchEmailAccountNow()
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(result.message)
    }
    emailAccount.value = await api.fetchEmailAccount()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toast.error(err.data?.message ?? 'No se pudo consultar el buzón')
  } finally {
    fetching.value = false
  }
}

function openNewRule() {
  editingRuleId.value = null
  ruleForm.value = {
    name: '',
    priority: 100,
    source: 'all',
    match_field: 'subject',
    match_mode: 'contains',
    pattern: '',
    functional_type_key: catalog.value?.functional_types[0]?.key ?? '',
    filing_type: 'incoming',
    is_active: true,
  }
  showRuleForm.value = true
}

function openEditRule(rule: VentanillaClassificationRuleRow) {
  editingRuleId.value = rule.id
  ruleForm.value = {
    name: rule.name,
    priority: rule.priority,
    source: rule.source ?? 'all',
    match_field: rule.match_field,
    match_mode: rule.match_mode,
    pattern: rule.pattern,
    functional_type_key: rule.functional_type_key,
    filing_type: rule.filing_type ?? 'incoming',
    is_active: rule.is_active,
  }
  showRuleForm.value = true
}

async function saveRule() {
  saving.value = true
  try {
    const body = {
      ...ruleForm.value,
      source: ruleForm.value.source === 'all' ? null : ruleForm.value.source,
    }
    if (editingRuleId.value) {
      await api.updateClassificationRule(editingRuleId.value, body)
      toast.success('Regla actualizada')
    } else {
      await api.createClassificationRule(body)
      toast.success('Regla creada')
    }
    showRuleForm.value = false
    rules.value = await api.fetchClassificationRules()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toast.error(err.data?.message ?? 'No se pudo guardar la regla')
  } finally {
    saving.value = false
  }
}

async function removeRule(ruleId: number) {
  saving.value = true
  try {
    await api.deleteClassificationRule(ruleId)
    rules.value = await api.fetchClassificationRules()
    toast.success('Regla eliminada')
  } catch {
    toast.error('No se pudo eliminar la regla')
  } finally {
    saving.value = false
  }
}

function functionalLabel(key: string): string {
  return catalog.value?.functional_types.find(t => t.key === key)?.label ?? key
}

function sourceLabel(source: string | null): string {
  if (!source) {
    return 'Todos'
  }
  return source === 'web_form' ? 'Formulario web' : 'Correo'
}
</script>

<template>
  <div class="space-y-6 p-4 md:p-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">
        Canales automáticos
      </h1>
      <p class="text-muted-foreground text-sm">
        Correo IMAP y reglas de preclasificación para la bandeja (HU-16 a HU-19)
      </p>
    </div>

    <div v-if="loading" class="py-12 text-center text-muted-foreground">
      Cargando…
    </div>

    <Tabs v-else v-model="activeTab" default-value="email">
      <TabsList>
        <TabsTrigger value="email">
          Correo IMAP
        </TabsTrigger>
        <TabsTrigger value="rules">
          Reglas de clasificación
        </TabsTrigger>
      </TabsList>

      <TabsContent value="email" class="mt-4 space-y-4">
        <Card v-if="emailAccount">
          <CardHeader>
            <CardTitle>Cuenta de correo entrante</CardTitle>
            <CardDescription>
              Los correos no leídos se ingresan a la bandeja de clasificación. También puede usar el comando
              <code class="text-xs">ventanilla:ingest-email</code> con JSON local.
            </CardDescription>
          </CardHeader>
          <CardContent class="grid gap-4 md:grid-cols-2">
            <div class="space-y-2 md:col-span-2">
              <Label>Nombre</Label>
              <Input v-model="emailAccount.name" />
            </div>
            <div class="space-y-2">
              <Label>Servidor IMAP</Label>
              <Input v-model="emailAccount.host" placeholder="imap.correo.com" />
            </div>
            <div class="space-y-2">
              <Label>Puerto</Label>
              <Input v-model.number="emailAccount.port" type="number" />
            </div>
            <div class="space-y-2">
              <Label>Cifrado</Label>
              <Select v-model="emailAccount.encryption">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ssl">SSL</SelectItem>
                  <SelectItem value="tls">TLS</SelectItem>
                  <SelectItem value="none">Ninguno</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>Usuario</Label>
              <Input v-model="emailAccount.username" />
            </div>
            <div class="space-y-2">
              <Label>Contraseña</Label>
              <Input v-model="emailPassword" type="password" :placeholder="emailAccount.has_password ? '••••••••' : 'Contraseña IMAP'" />
            </div>
            <div class="space-y-2">
              <Label>Buzón</Label>
              <Input v-model="emailAccount.mailbox" />
            </div>
            <div class="flex items-center gap-2 pt-6">
              <Checkbox
                :checked="emailAccount.is_active"
                @update:checked="(v) => { if (emailAccount) emailAccount.is_active = v === true }"
              />
              <Label class="font-normal">Cuenta activa (consulta automática cada 5 min)</Label>
            </div>
            <div v-if="emailAccount.last_fetched_at" class="md:col-span-2 text-sm text-muted-foreground">
              Última consulta: {{ new Date(emailAccount.last_fetched_at).toLocaleString('es-CO') }}
              <span v-if="emailAccount.last_fetch_error" class="block text-destructive">
                {{ emailAccount.last_fetch_error }}
              </span>
            </div>
          </CardContent>
          <CardFooter class="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" :disabled="testing" @click="testConnection">
              Probar conexión
            </Button>
            <Button variant="outline" :disabled="fetching" @click="fetchNow">
              Consultar buzón ahora
            </Button>
            <Button :disabled="saving" @click="saveEmailAccount">
              Guardar
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>

      <TabsContent value="rules" class="mt-4 space-y-4">
        <Card v-if="showRuleForm">
          <CardHeader>
            <CardTitle>{{ editingRuleId ? 'Editar regla' : 'Nueva regla' }}</CardTitle>
          </CardHeader>
          <CardContent class="grid gap-4 md:grid-cols-2">
            <div class="space-y-2">
              <Label>Nombre</Label>
              <Input v-model="ruleForm.name" />
            </div>
            <div class="space-y-2">
              <Label>Prioridad (menor = primero)</Label>
              <Input v-model.number="ruleForm.priority" type="number" min="1" />
            </div>
            <div class="space-y-2">
              <Label>Canal</Label>
              <Select v-model="ruleForm.source">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="email">Correo</SelectItem>
                  <SelectItem value="web_form">Formulario web</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>Campo</Label>
              <Select v-model="ruleForm.match_field">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="subject">Asunto</SelectItem>
                  <SelectItem value="body">Cuerpo</SelectItem>
                  <SelectItem value="sender_email">Correo remitente</SelectItem>
                  <SelectItem value="sender_name">Nombre remitente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>Modo</Label>
              <Select v-model="ruleForm.match_mode">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contains">Contiene</SelectItem>
                  <SelectItem value="regex">Expresión regular</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>Patrón</Label>
              <Input v-model="ruleForm.pattern" placeholder="pqrs, factura, …" />
            </div>
            <div class="space-y-2">
              <Label>Tipo funcional sugerido</Label>
              <Select v-model="ruleForm.functional_type_key">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="t in catalog?.functional_types ?? []" :key="t.key" :value="t.key">
                    {{ t.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="flex items-center gap-2 pt-6">
              <Checkbox
                :checked="ruleForm.is_active"
                @update:checked="(v) => { ruleForm.is_active = v === true }"
              />
              <Label class="font-normal">Activa</Label>
            </div>
          </CardContent>
          <CardFooter class="justify-end gap-2">
            <Button variant="outline" @click="showRuleForm = false">
              Cancelar
            </Button>
            <Button :disabled="saving" @click="saveRule">
              Guardar regla
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Reglas de preclasificación</CardTitle>
              <CardDescription>
                Se aplican al crear entradas en bandeja (correo y formulario web).
              </CardDescription>
            </div>
            <Button size="sm" @click="openNewRule">
              Nueva regla
            </Button>
          </CardHeader>
          <CardContent>
            <Table v-if="rules.length">
              <TableHeader>
                <TableRow>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Coincide</TableHead>
                  <TableHead>Sugiere</TableHead>
                  <TableHead>Activa</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="rule in rules" :key="rule.id">
                  <TableCell>{{ rule.priority }}</TableCell>
                  <TableCell>{{ rule.name }}</TableCell>
                  <TableCell>{{ sourceLabel(rule.source) }}</TableCell>
                  <TableCell class="text-xs">
                    {{ rule.match_field }} {{ rule.match_mode }} «{{ rule.pattern }}»
                  </TableCell>
                  <TableCell>{{ functionalLabel(rule.functional_type_key) }}</TableCell>
                  <TableCell>{{ rule.is_active ? 'Sí' : 'No' }}</TableCell>
                  <TableCell class="text-right space-x-1">
                    <Button variant="ghost" size="sm" @click="openEditRule(rule)">
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" class="text-destructive" @click="removeRule(rule.id)">
                      Eliminar
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <p v-else class="text-sm text-muted-foreground">
              No hay reglas configuradas.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</template>
