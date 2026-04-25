<script setup lang="ts">
import Multiselect from '@vueform/multiselect'
import type { TipoValorCuota } from '~/utils/analisis-emergencia-cuota'
import { TIPO_VALOR_CUOTA_OPCIONES } from '~/utils/analisis-emergencia-cuota'

const model = defineModel<TipoValorCuota>({ required: true })
</script>

<template>
  <div class="flex min-h-0 min-w-0 flex-col space-y-2">
    <Label for="as-tipo-vc" class="text-sm font-medium">Tipo de Valor de cuota</Label>
    <Multiselect
      id="as-tipo-vc"
      :model-value="model && (model === 'Corriente' || model === 'Emergencia') ? model : null"
      mode="single"
      :object="false"
      :options="TIPO_VALOR_CUOTA_OPCIONES"
      :searchable="false"
      :can-clear="true"
      placeholder="Seleccionar"
      no-options-text="Sin opciones"
      class="multiselect-municipality w-full"
      @update:model-value="(v: unknown) => {
        model = (v === 'Corriente' || v === 'Emergencia') ? v : ''
      }"
    />
  </div>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>
<style scoped>
/* Misma franja que Button outline min-h-10 del perfil (h-10 = 2.5rem) */
.multiselect-municipality {
  --ms-font-size: 0.875rem;
  --ms-line-height: 1.25rem;
  --ms-radius: 0.375rem;
  --ms-border-color: var(--border);
  --ms-bg: var(--background);
  --ms-py: 0.5rem;
  min-height: 2.5rem;
  width: 100%;
  min-width: 0;
}
</style>
