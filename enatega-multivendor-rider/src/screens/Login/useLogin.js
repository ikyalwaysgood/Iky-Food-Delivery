import { useContext, useState } from 'react'
import { Dimensions } from 'react-native'
import { riderLogin } from '../../apollo/mutations'
import { AuthContext } from '../../context/auth'
import { FlashMessage } from '../../components/FlashMessage/FlashMessage'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { gql, useMutation } from '@apollo/client'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { useTranslation } from 'react-i18next'

const RIDER_LOGIN = gql`
  ${riderLogin}
`

const useLogin = () => {
  const { t } = useTranslation()
  const [username, setUsername] = useState('rider2')
  const [password, setPassword] = useState('12345')
  const [showPassword, setShowPassword] = useState(true)
  const [usernameError, setUsernameError] = useState(false)
  const [passwordError, setPasswordError] = useState(false)
  const { height } = Dimensions.get('window')

  const { setTokenAsync } = useContext(AuthContext)

  const [mutate, { loading }] = useMutation(RIDER_LOGIN, {
    onCompleted,
    onError
  })

  function validateForm() {
    let result = true
    setUsernameError('')
    setPasswordError('')

    if (!username) {
      setUsernameError(t('emptyUsernameError'))
      result = false
    }
    if (!password) {
      setPasswordError(t('emptyPasswordError'))
      result = false
    }
    return result
  }

  async function onCompleted(data) {

    FlashMessage({ message: t('loginFlashMsg') })
    await AsyncStorage.setItem('rider-id', data.riderLogin.userId)
    await setTokenAsync(data.riderLogin.token)
  }
  function onError(error) {
    console.log('error', JSON.stringify(error))
    let message = 'Check internet connection'
    try {
      message = error.message
    } catch (error) { }
    FlashMessage({ message: message })
  }

  async function onSubmit() {
    if (validateForm()) {
      // Get notification permissions
      const settings = await Notifications.getPermissionsAsync();
      let notificationPermissions = { ...settings };

      // Request notification permissions if not granted or not provisional on iOS
      if (
        settings?.status !== 'granted' ||
        settings.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL
      ) {
        notificationPermissions = await Notifications.requestPermissionsAsync({
          ios: {
            allowProvisional: true,
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: true,
          },
        });
      }

      let notificationToken = null;
      // Get notification token if permissions are granted and it's a device
      if (
        (notificationPermissions?.status === 'granted' ||
          notificationPermissions.ios?.status ===
          Notifications.IosAuthorizationStatus.PROVISIONAL) &&
        Device.isDevice
      ) {
        notificationToken = (await Notifications.getExpoPushTokenAsync()).data;
      }

      // Perform mutation with the obtained data
      mutate({
        variables: {
          username: username.toLowerCase(),
          password: password,
          notificationToken: notificationToken,
        },
      });
    }
  }
  return {
    username,
    setUsername,
    password,
    setPassword,
    usernameError,
    passwordError,
    onSubmit,
    showPassword,
    setShowPassword,
    loading,
    height
  }
}

export default useLogin
