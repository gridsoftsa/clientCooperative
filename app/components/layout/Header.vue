<script setup lang="ts">
const route = useRoute()

function setLinks() {
  if (route.fullPath === '/') {
    return [{ title: 'Home', href: '/' }]
  }

  const segments = route.fullPath.split('/').filter(item => item !== '')

  const breadcrumbs = segments.map((item, index) => {
    const str = item.replace(/-/g, ' ')
    const title = str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')

    return {
      title,
      href: `/${segments.slice(0, index + 1).join('/')}`,
    }
  })

  return [{ title: 'Home', href: '/' }, ...breadcrumbs]
}

const links = ref<{
  title: string
  href: string
}[]>(setLinks())

watch(() => route.fullPath, (val) => {
  if (val) {
    links.value = setLinks()
  }
})
</script>

<template>
  <header
    class="app-header sticky top-0 z-10 h-(--header-height) flex items-center gap-4 border-b border-header-border bg-header px-4 text-header-foreground md:peer-data-[variant=inset]:top-2 md:px-6 md:rounded-tl-xl md:rounded-tr-xl
      hover:[&_[data-slot=sidebar-trigger]]:bg-header-foreground/10"
  >
    <div class="w-full flex h-4 items-center gap-4">
      <SidebarTrigger />
      <Separator class="!bg-header-foreground/25" orientation="vertical" />
      <BaseBreadcrumbCustom :links="links" />
    </div>
    <div class="ml-auto">
      <slot />
    </div>
  </header>
</template>

<style scoped>

</style>
