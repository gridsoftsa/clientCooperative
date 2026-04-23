<script setup lang="ts">
import type { ThemeColor, ThemeType } from '@/constants/themes'
import { DEFAULT_THEME_COLOR, THEME_COLORS, THEME_TYPE } from '@/constants/themes'

const { theme, updateAppSettings } = useAppSettings()

const allColors: ThemeColor[] = THEME_COLORS.map(color => color.name)
const allTypes: ThemeType[] = THEME_TYPE

watch(() => theme.value?.color, () => {
  setClassColor()
})

function setClassColor() {
  document.body.classList.remove(
    ...allColors.map(color => `color-${color}`),
  )
  document.body.classList.add(`color-${theme.value?.color || DEFAULT_THEME_COLOR}`)
}

watch(() => theme.value?.type, () => {
  setClassType()
})

function setClassType() {
  document.body.classList.remove(
    ...allTypes.map(type => `theme-${type}`),
  )
  document.body.classList.add(`theme-${theme.value?.type || 'default'}`)
}

function backgroundColor(color: ThemeColor) {
  const bg = THEME_COLORS.find(theme => theme.name === color)
  return bg?.value
}

const colorMode = useColorMode()

const themeColorLabelEs: Record<string, string> = {
  default: 'Por defecto',
  cooperative: 'Empresarial',
  blue: 'Azul',
  green: 'Verde',
  red: 'Rojo',
  rose: 'Rosa',
  violet: 'Violeta',
  orange: 'Naranja',
  yellow: 'Amarillo',
  teal: 'Turquesa',
}

const themeTypeLabelEs: Record<string, string> = {
  default: 'Predeterminado',
  scaled: 'Escalado',
  mono: 'Monocromático',
}

function colorLabel(name: string): string {
  return themeColorLabelEs[name] ?? name
}

/** Nombre descriptivo largo (tooltip) cuando la etiqueta visible está acortada. */
const themeColorLabelFull: Record<string, string> = {
  default: 'Predeterminado (gris)',
  cooperative: 'Empresarial (identidad cooperativa)',
  blue: 'Azul',
  green: 'Verde',
  red: 'Rojo',
  rose: 'Rosa',
  violet: 'Violeta',
  orange: 'Naranja',
  yellow: 'Amarillo',
  teal: 'Verde azulado (teal)',
}

function colorLabelFull(name: string): string {
  return themeColorLabelFull[name] ?? colorLabel(name)
}

function typeLabel(name: string): string {
  return themeTypeLabelEs[name] ?? name
}
</script>

<template>
  <div class="grid gap-6">
    <div class="space-y-1.5">
      <Label>Color</Label>
      <div class="grid grid-cols-2 gap-2 min-[500px]:grid-cols-3">
        <template v-for="col in allColors" :key="col">
          <Button
            class="!h-auto min-h-0 w-full min-w-0 max-w-full flex-col items-stretch justify-center gap-1.5 overflow-hidden !whitespace-normal py-2.5 px-1.5 sm:px-2"
            variant="outline"
            :class="{ '!border-primary border-2 !bg-primary/10': theme?.color === col }"
            :title="colorLabelFull(col)"
            @click="updateAppSettings({ theme: { color: col } })"
          >
            <span class="mx-auto flex h-6 w-6 shrink-0 items-center justify-center self-center rounded-full border border-white shadow-sm" :style="{ backgroundColor: backgroundColor(col) }">
              <Icon v-if="col === theme?.color" name="i-radix-icons-check" size="14" class="text-white drop-shadow" />
            </span>
            <span class="w-full min-w-0 text-center text-[10px] leading-tight sm:text-xs text-balance [overflow-wrap:anywhere]">
              {{ colorLabel(col) }}
            </span>
          </Button>
        </template>
      </div>
    </div>
    <div class="space-y-1.5">
      <Label>Estilo</Label>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <template v-for="themeType in allTypes" :key="themeType">
          <Button
            class="!h-auto min-h-9 w-full min-w-0 items-center justify-center gap-1.5 overflow-hidden !whitespace-normal px-2 py-1.5"
            variant="outline"
            :class="{ '!border-primary border-2 !bg-primary/10': theme?.type === themeType }"
            @click="updateAppSettings({ theme: { type: themeType } })"
          >
            <span class="w-full min-w-0 text-center text-[10px] leading-tight sm:text-xs [overflow-wrap:anywhere] sm:text-balance">{{ typeLabel(themeType) }}</span>
          </Button>
        </template>
      </div>
    </div>
    <div class="space-y-1.5">
      <Label>Tema</Label>
      <div class="grid grid-cols-1 gap-2 min-[400px]:grid-cols-3">
        <Button
          class="!h-auto min-h-9 w-full min-w-0 items-center justify-center gap-1.5 !whitespace-normal px-2 py-1.5"
          variant="outline"
          :class="{ '!border-primary border-2 !bg-primary/10': colorMode.preference === 'light' }"
          @click="colorMode.preference = 'light'"
        >
          <Icon name="i-ph-sun-dim-duotone" size="16" class="shrink-0" />
          <span class="min-w-0 text-center text-xs leading-tight">Claro</span>
        </Button>
        <Button
          class="!h-auto min-h-9 w-full min-w-0 items-center justify-center gap-1.5 !whitespace-normal px-2 py-1.5"
          variant="outline"
          :class="{ '!border-primary border-2 !bg-primary/10': colorMode.preference === 'dark' }"
          @click="colorMode.preference = 'dark'"
        >
          <Icon name="i-ph-moon-stars-duotone" size="16" class="shrink-0" />
          <span class="min-w-0 text-center text-xs leading-tight">Oscuro</span>
        </Button>
        <Button
          class="!h-auto min-h-9 w-full min-w-0 items-center justify-center gap-1.5 !whitespace-normal px-2 py-1.5"
          variant="outline"
          :class="{ '!border-primary border-2 !bg-primary/10': colorMode.preference === 'system' }"
          @click="colorMode.preference = 'system'"
        >
          <Icon name="i-lucide-monitor" size="16" class="shrink-0" />
          <span class="min-w-0 text-center text-xs leading-tight">Sistema</span>
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>
