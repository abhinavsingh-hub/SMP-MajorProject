package com.socialparse.mobile

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent

class CaptureAccessibilityService : AccessibilityService() {

  companion object {
    var instance: CaptureAccessibilityService? = null
      private set

    var onStatusChangeListener: ((Boolean) -> Unit)? = null
  }

  override fun onServiceConnected() {
    super.onServiceConnected()
    instance = this
    onStatusChangeListener?.invoke(true)
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    // No-op for now (inspection and automation added in subsequent commits)
  }

  override fun onInterrupt() {
    // No-op
  }

  override fun onUnbind(intent: Intent?): Boolean {
    instance = null
    onStatusChangeListener?.invoke(false)
    return super.onUnbind(intent)
  }

  override fun onDestroy() {
    instance = null
    onStatusChangeListener?.invoke(false)
    super.onDestroy()
  }
}
