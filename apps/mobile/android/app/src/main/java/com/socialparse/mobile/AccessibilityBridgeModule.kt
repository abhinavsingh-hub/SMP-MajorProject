package com.socialparse.mobile

import android.content.Intent
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.concurrent.Executors

class AccessibilityBridgeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  private val executor = Executors.newSingleThreadExecutor()
  private val actions = AutomationActions(reactContext)

  init {
    CaptureAccessibilityService.onStatusChangeListener = { isEnabled ->
      val params = Arguments.createMap().apply {
        putBoolean("enabled", isEnabled)
      }
      sendEvent("accessibilityStatus", params)
    }
  }

  override fun getName(): String = "AccessibilityBridgeModule"

  @ReactMethod
  fun isEnabled(promise: Promise) {
    try {
      promise.resolve(CaptureAccessibilityService.instance != null)
    } catch (e: Exception) {
      promise.reject("STATUS_ERROR", "Failed to check accessibility status: ${e.message}", e)
    }
  }

  @ReactMethod
  fun openSettings(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK
      }
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("SETTINGS_ERROR", "Failed to open accessibility settings: ${e.message}", e)
    }
  }

  @ReactMethod
  fun clickByText(text: String, exact: Boolean, promise: Promise) {
    executor.execute {
      try {
        val result = actions.clickByText(text, exact)
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("CLICK_TEXT_ERROR", e.message, e)
      }
    }
  }

  @ReactMethod
  fun clickByViewId(id: String, promise: Promise) {
    executor.execute {
      try {
        val result = actions.clickByViewId(id)
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("CLICK_VIEW_ID_ERROR", e.message, e)
      }
    }
  }

  @ReactMethod
  fun waitForText(text: String, timeoutMs: Double, promise: Promise) {
    executor.execute {
      try {
        val result = actions.waitForText(text, timeoutMs.toLong())
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("WAIT_TEXT_ERROR", e.message, e)
      }
    }
  }

  @ReactMethod
  fun scrollForward(promise: Promise) {
    executor.execute {
      try {
        val result = actions.scrollForward()
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("SCROLL_ERROR", e.message, e)
      }
    }
  }

  @ReactMethod
  fun performBack(promise: Promise) {
    executor.execute {
      try {
        val result = actions.performBack()
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("GLOBAL_BACK_ERROR", e.message, e)
      }
    }
  }

  @ReactMethod
  fun performHome(promise: Promise) {
    executor.execute {
      try {
        val result = actions.performHome()
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("GLOBAL_HOME_ERROR", e.message, e)
      }
    }
  }

  @ReactMethod
  fun getForegroundPackage(promise: Promise) {
    executor.execute {
      try {
        val result = actions.getForegroundPackage()
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("FOREGROUND_PKG_ERROR", e.message, e)
      }
    }
  }

  @ReactMethod
  fun launchApp(packageName: String, promise: Promise) {
    executor.execute {
      try {
        val result = actions.launchApp(packageName)
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("LAUNCH_APP_ERROR", e.message, e)
      }
    }
  }

  @ReactMethod
  fun addListener(eventName: String) {
    // Required for React Native event emitter
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    // Required for React Native event emitter
  }

  private fun sendEvent(eventName: String, params: WritableMap) {
    if (reactContext.hasActiveReactInstance()) {
      reactContext
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit(eventName, params)
    }
  }
}
