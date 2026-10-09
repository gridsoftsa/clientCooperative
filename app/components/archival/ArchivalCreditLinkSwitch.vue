<script setup lang="ts">
const enabled = defineModel<boolean>({ default: false })

defineProps<{
  globalEnabled: boolean
  disabled?: boolean
}>()
</script>

<template>
  <div
    v-if="globalEnabled"
    class="flex items-center justify-between gap-4 rounded-lg border p-4 sm:col-span-2"
  >
    <div class="space-y-1">
      <p class="text-sm font-medium">
        Enlazar con expediente documental
      </p>
      <p class="text-xs leading-relaxed text-muted-foreground">
        Al enviar la radicación se crea el expediente de crédito debajo del expediente del asociado,
        en el área de su cargo. Si lo deja apagado, el crédito sigue igual sin expediente.
      </p>
    </div>
    <Switch :checked="enabled" :disabled="disabled" @update:checked="enabled = $event === true" />
  </div>
</template>
