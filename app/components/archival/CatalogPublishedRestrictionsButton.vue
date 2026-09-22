<script setup lang="ts">
import type { CatalogConfidentialityPayload } from '~/types/archival-catalog'
import {
  catalogRestrictionsButtonLabel,
  withCatalogRestrictionsQuery,
} from '~/utils/catalog-published-restrictions'

const props = withDefaults(defineProps<{
  editHref: string
  confidentiality?: CatalogConfidentialityPayload | null
  buttonClass?: string
}>(), {
  confidentiality: null,
  buttonClass: 'h-8 gap-1.5 px-2 text-xs',
})

const router = useRouter()

function openRestrictions(): void {
  void router.push(withCatalogRestrictionsQuery(props.editHref))
}
</script>

<template>
  <Button
    type="button"
    variant="outline"
    size="sm"
    :class="buttonClass"
    @click.stop="openRestrictions"
  >
    <Icon name="i-lucide-lock" class="size-4 shrink-0" />
    {{ catalogRestrictionsButtonLabel(confidentiality) }}
  </Button>
</template>
