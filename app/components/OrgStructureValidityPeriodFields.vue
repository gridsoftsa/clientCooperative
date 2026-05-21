<script setup lang="ts">
const validFrom = defineModel<string>('validFrom', { default: '' })
const validTo = defineModel<string>('validTo', { default: '' })

withDefaults(
  defineProps<{
    fromInputId?: string
    toInputId?: string
  }>(),
  {
    fromInputId: 'org_valid_from',
    toInputId: 'org_valid_to',
  },
)
</script>

<template>
  <div class="rounded-lg border border-dashed p-4 space-y-4 md:col-span-2">
    <p class="text-sm font-medium text-foreground leading-snug">
      Vigencia normativa
    </p>
    <p class="text-xs text-muted-foreground leading-relaxed">
      La fecha de inicio es obligatoria para conservar el histórico. La fecha de cierre es opcional.
    </p>
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-6">
      <div class="space-y-2">
        <Label :for="fromInputId" class="leading-snug">Vigente desde *</Label>
        <Input :id="fromInputId" v-model="validFrom" type="date" required />
      </div>
      <div class="space-y-2">
        <Label :for="toInputId" class="leading-snug">Vigente hasta</Label>
        <Input :id="toInputId" v-model="validTo" type="date" />
      </div>
    </div>
  </div>
</template>
