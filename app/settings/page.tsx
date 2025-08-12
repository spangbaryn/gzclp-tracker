import { AppContainer } from '@/components/app-container'
import { getOrCreateUser } from '@/lib/user'
import { SettingsForm } from '@/components/settings-form'
import { ResetButton } from '@/components/reset-button'

export default async function SettingsPage() {
  const user = await getOrCreateUser()

  return (
    <AppContainer>
      <SettingsForm settings={user.settings!} />
      <ResetButton />
    </AppContainer>
  )
}