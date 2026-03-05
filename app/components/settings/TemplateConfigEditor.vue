<script setup lang="ts">
import {
  getTemplateConfigSchema,
  computeFormulaForConfig,
  EXCLUDED_CONFIG_KEYS,
  type TemplateConfigField,
} from '~/constants/template-config-schemas'

interface FlatDataRecord {
  id: number
  template_key: string
  product_key: string | null
  config_data: Record<string, unknown>
  updated_at: string
}

const props = defineProps<{
  record: FlatDataRecord
  templateLabel: string
  productLabel: string
  saving: boolean
  canEdit: boolean
  categoryId?: number
}>()

const emit = defineEmits<{
  save: [data: Record<string, unknown>]
  delete: []
}>()

const editing = ref(false)
const editedData = ref<Record<string, unknown>>({ ...props.record.config_data })

watch(() => props.record.config_data, (newVal) => {
  editedData.value = { ...newVal }
}, { immediate: true })

const schema = computed(() => getTemplateConfigSchema(props.record.template_key))

function formatKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function isNumericValue(val: unknown): boolean {
  if (val === null || val === undefined) return true
  if (typeof val === 'number') return true
  if (typeof val === 'string') return /^-?\d*\.?\d*$/.test(val.trim()) || val === ''
  return false
}

function getComputedFormulaValue(field: TemplateConfigField): string {
  if (field.type !== 'formula' || !field.formulaKey) return '—'
  const val = computeFormulaForConfig(field.formulaKey, editedData.value)
  return val != null ? String(val) : '—'
}

function isMoneyKey(key: string): boolean {
  const k = key.toLowerCase()
  return k.includes('precio') || k.includes('costo') || k.includes('valor')
}

function isExcludedConfigKey(templateKey: string, key: string): boolean {
  return EXCLUDED_CONFIG_KEYS[templateKey]?.includes(key) ?? false
}

const visibleConfigEntries = computed(() =>
  Object.entries(editedData.value).filter(
    ([key]) => !isExcludedConfigKey(props.record.template_key, key),
  ),
)

function handleSave() {
  emit('save', { ...editedData.value })
  editing.value = false
}

function handleCancel() {
  editedData.value = { ...props.record.config_data }
  editing.value = false
}
</script>

<template>
  <div class="rounded-lg border bg-muted/30 p-4 space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h4 class="font-medium text-sm">
          {{ templateLabel }}
          <Badge v-if="productLabel !== 'Default (plantilla)'" variant="outline" class="ml-2 text-xs">
            {{ productLabel }}
          </Badge>
        </h4>
        <p class="text-xs text-muted-foreground">
          Última actualización: {{ new Date(record.updated_at).toLocaleString('es-CO') }}
        </p>
      </div>
      <div v-if="canEdit" class="flex gap-2">
        <Button
          v-if="categoryId"
          variant="ghost"
          size="sm"
          class="text-destructive hover:text-destructive"
          @click="emit('delete')"
        >
          <Icon name="i-lucide-trash-2" class="mr-1 h-4 w-4" />
          Eliminar
        </Button>
        <Button
          v-if="!editing"
          variant="outline"
          size="sm"
          @click="editing = true"
        >
          <Icon name="i-lucide-pencil" class="mr-1 h-4 w-4" />
          Editar
        </Button>
        <template v-else>
          <Button variant="ghost" size="sm" :disabled="saving" @click="handleCancel">
            Cancelar
          </Button>
          <Button size="sm" :disabled="saving" @click="handleSave">
            <Icon v-if="saving" name="i-lucide-loader-2" class="mr-1 h-4 w-4 animate-spin" />
            Guardar
          </Button>
        </template>
      </div>
    </div>

    <!-- Con schema (ganado-ceba, etc.): orden, tipos, fórmula -->
    <template v-if="schema">
      <div
        v-for="section in schema.sections"
        :key="section.key"
        class="space-y-3"
      >
        <h5 v-if="section.title" class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {{ section.title }}
        </h5>
        <div class="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-end">
          <template v-for="field in section.fields" :key="field.key">
            <!-- Campo fórmula (solo lectura) -->
            <div v-if="field.type === 'formula'" class="flex flex-col gap-1 min-w-0">
              <Label :for="`cfg-${record.id}-${field.key}`" class="text-xs">
                {{ field.label }}
                <span v-if="field.formulaDisplay" class="text-muted-foreground font-normal">
                  ({{ field.formulaDisplay }})
                </span>
              </Label>
              <Input
                :id="`cfg-${record.id}-${field.key}`"
                :model-value="getComputedFormulaValue(field)"
                type="text"
                readonly
                disabled
                class="h-8 text-sm bg-muted/50 cursor-default"
                placeholder="—"
              />
            </div>
            <!-- Campo dinero -->
            <div v-else-if="field.type === 'money'" class="flex flex-col gap-1 min-w-0">
              <CreditsBaseMoneyInput
                :model-value="(editedData[field.key] as number | null) ?? null"
                :label="field.label"
                class="[&_input]:h-8 [&_input]:text-sm"
                :disabled="!editing || !canEdit"
                placeholder="0"
                @update:model-value="(v) => (editedData[field.key] = v)"
              />
            </div>
            <!-- Campo número -->
            <div v-else-if="field.type === 'number'" class="flex flex-col gap-1 min-w-0">
              <Label :for="`cfg-${record.id}-${field.key}`" class="text-xs">
                {{ field.label }}
              </Label>
              <Input
                :id="`cfg-${record.id}-${field.key}`"
                v-model="editedData[field.key]"
                type="number"
                step="0.01"
                class="h-8 text-sm"
                :disabled="!editing || !canEdit"
                placeholder="—"
                @keydown.enter.prevent="handleSave"
              />
            </div>
            <!-- Campo texto -->
            <div v-else class="flex flex-col gap-1 min-w-0">
              <Label :for="`cfg-${record.id}-${field.key}`" class="text-xs">
                {{ field.label }}
              </Label>
              <Input
                :id="`cfg-${record.id}-${field.key}`"
                v-model="editedData[field.key]"
                type="text"
                class="h-8 text-sm"
                :disabled="!editing || !canEdit"
                placeholder="—"
                @keydown.enter.prevent="handleSave"
              />
            </div>
          </template>
        </div>
      </div>
    </template>

    <!-- Sin schema: fallback genérico -->
    <div v-else class="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-end">
      <div
        v-for="[key, value] in visibleConfigEntries"
        :key="key"
        class="flex flex-col gap-1 min-w-0"
      >
        <CreditsBaseMoneyInput
          v-if="isMoneyKey(key)"
          :model-value="(value as number | null) ?? null"
          :label="formatKey(key)"
          class="[&_input]:h-8 [&_input]:text-sm"
          :disabled="!editing || !canEdit"
          placeholder="0"
          @update:model-value="(v) => (editedData[key] = v)"
        />
        <template v-else>
          <Label :for="`cfg-${record.id}-${key}`" class="text-xs">
            {{ formatKey(key) }}
          </Label>
          <Input
            v-if="isNumericValue(value)"
            :id="`cfg-${record.id}-${key}`"
            v-model="editedData[key]"
            type="number"
            step="0.01"
            class="h-8 text-sm"
            :disabled="!editing || !canEdit"
            placeholder="—"
            @keydown.enter.prevent="handleSave"
          />
          <Input
            v-else
            :id="`cfg-${record.id}-${key}`"
            v-model="editedData[key]"
            type="text"
            class="h-8 text-sm"
            :disabled="!editing || !canEdit"
            placeholder="—"
            @keydown.enter.prevent="handleSave"
          />
        </template>
      </div>
    </div>
  </div>
</template>
