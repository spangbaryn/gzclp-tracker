import { AppContainer } from '@/components/app-container'
import { getOrCreateUser } from '@/lib/user'
import { SettingsForm } from '@/components/settings-form'

export default async function SettingsPage() {
  const user = await getOrCreateUser()

  return (
    <AppContainer>
      <SettingsForm settings={user.settings!} />
    </AppContainer>
  )
}