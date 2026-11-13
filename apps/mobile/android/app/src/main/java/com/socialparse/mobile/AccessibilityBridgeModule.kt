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

class AccessibilityBridgeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

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
