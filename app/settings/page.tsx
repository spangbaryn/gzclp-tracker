import { AppContainer } from '@/components/app-container'
import { getOrCreateUser } from '@/lib/user'
import { SettingsForm } from '@/components/settings-form'

// Disable caching to ensure fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SettingsPage() {
  const user = await getOrCreateUser()

  return (
    <AppContainer>
      <SettingsForm settings={user.settings!} />
    </AppContainer>
  )
}