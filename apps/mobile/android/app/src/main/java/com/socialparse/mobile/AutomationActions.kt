package com.socialparse.mobile

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.os.SystemClock
import android.view.accessibility.AccessibilityNodeInfo

class AutomationActions(private val context: Context) {

  private val service: CaptureAccessibilityService
    get() = CaptureAccessibilityService.instance
        ?: throw IllegalStateException("CaptureAccessibilityService is not connected or enabled.")

  private val rootNode: AccessibilityNodeInfo
    get() = service.rootInActiveWindow
        ?: throw IllegalStateException("Active window root node is not available.")

  fun clickByText(text: String, exact: Boolean): Boolean {
    val root = rootNode
    val matchingNode = findNodeByText(root, text, exact) ?: return false
    return performClickOnNodeOrAncestor(matchingNode)
  }

  fun clickByViewId(id: String): Boolean {
    val root = rootNode
    val nodes = root.findAccessibilityNodeInfosByViewId(id)
    if (nodes.isNullOrEmpty()) return false
    for (node in nodes) {
      if (performClickOnNodeOrAncestor(node)) {
        return true
      }
    }
    return false
  }

  fun waitForText(text: String, timeoutMs: Long): Boolean {
    val startTime = SystemClock.uptimeMillis()
    while (SystemClock.uptimeMillis() - startTime < timeoutMs) {
      try {
        val root = service.rootInActiveWindow
        if (root != null) {
          val node = findNodeByText(root, text, exact = false)
          if (node != null) {
            safeRecycle(node)
            return true
          }
        }
      } catch (_: Exception) {
        // Window may be transitioning, retry on next interval
      }
      SystemClock.sleep(300)
    }
    return false
  }

  fun scrollForward(): Boolean {
    val root = rootNode
    val scrollableNode = findFirstScrollableNode(root) ?: return false
    return try {
      scrollableNode.performAction(AccessibilityNodeInfo.ACTION_SCROLL_FORWARD)
    } finally {
      safeRecycle(scrollableNode)
    }
  }

  fun performBack(): Boolean {
    return service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_BACK)
  }

  fun performHome(): Boolean {
    return service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_HOME)
  }

  fun getForegroundPackage(): String {
    val root = service.rootInActiveWindow ?: return ""
    return try {
      root.packageName?.toString() ?: ""
    } finally {
      safeRecycle(root)
    }
  }

  fun launchApp(packageName: String): Boolean {
    val pm = context.packageManager
    val launchIntent = pm.getLaunchIntentForPackage(packageName) ?: return false
    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    context.startActivity(launchIntent)
    return true
  }

  private fun findNodeByText(node: AccessibilityNodeInfo?, target: String, exact: Boolean): AccessibilityNodeInfo? {
    if (node == null) return null

    val nodeText = node.text?.toString()
    val contentDesc = node.contentDescription?.toString()

    val textMatches = if (exact) {
      nodeText.equals(target, ignoreCase = true) || contentDesc.equals(target, ignoreCase = true)
    } else {
      nodeText?.contains(target, ignoreCase = true) == true || contentDesc?.contains(target, ignoreCase = true) == true
    }

    if (textMatches) {
      return node
    }

    for (i in 0 until node.childCount) {
      val child = node.getChild(i)
      val found = findNodeByText(child, target, exact)
      if (found != null) {
        if (found !== child) {
          safeRecycle(child)
        }
        return found
      }
      safeRecycle(child)
    }

    return null
  }

  private fun findFirstScrollableNode(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
    if (node == null) return null
    if (node.isScrollable) return node

    for (i in 0 until node.childCount) {
      val child = node.getChild(i)
      val found = findFirstScrollableNode(child)
      if (found != null) {
        if (found !== child) {
          safeRecycle(child)
        }
        return found
      }
      safeRecycle(child)
    }

    return null
  }

  private fun performClickOnNodeOrAncestor(targetNode: AccessibilityNodeInfo): Boolean {
    var current: AccessibilityNodeInfo? = targetNode
    while (current != null) {
      if (current.isClickable) {
        val result = current.performAction(AccessibilityNodeInfo.ACTION_CLICK)
        if (current !== targetNode) {
          safeRecycle(current)
        }
        safeRecycle(targetNode)
        return result
      }
      val parent = current.parent
      if (current !== targetNode) {
        safeRecycle(current)
      }
      current = parent
    }

    val fallback = targetNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
    safeRecycle(targetNode)
    return fallback
  }

  private fun safeRecycle(node: AccessibilityNodeInfo?) {
    try {
      node?.recycle()
    } catch (_: Exception) {
      // Ignored for safety across Android API levels
    }
  }
}
