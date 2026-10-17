package com.zaal.app

import android.app.Application
import android.content.Context
import android.content.res.Configuration

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

/**
 * Every screen is fixed art with text laid over it, sized for fontScale 1.
 * Xiaomi (MIUI/HyperOS) and Samsung ship with a larger system text size on
 * by default, and React Native scales every <Text> by it — prompts wrapped to
 * extra lines and pushed cards off-screen, a word on the letter page overran
 * its box by a full line. Pin fontScale to 1 for this app only.
 *
 * The override must set fontScale *only*. Copying the whole current
 * configuration also pins orientation and screen size to whatever they were
 * at launch: a tablet that started the process in portrait (R8 builds start
 * fast enough to beat the rotation to landscape) then fed React Native
 * portrait window metrics forever, and the app drew in the portrait fallback
 * box on a landscape screen.
 */
fun Context.withFixedFontScale(): Context {
  if (resources.configuration.fontScale == 1f) return this
  // A fresh Configuration() leaves every field undefined except fontScale,
  // so it only overrides fontScale; the rest keeps tracking the device.
  return createConfigurationContext(Configuration().apply { fontScale = 1f })
}

class MainApplication : Application(), ReactApplication {

  override fun attachBaseContext(base: Context) {
    super.attachBaseContext(base.withFixedFontScale())
  }

  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
      this,
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
            }

          override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      }
  )

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
