package com.socialparse.mobile

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjectionManager
import android.os.Handler
import android.os.HandlerThread
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileOutputStream

class ScreenCaptureModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

  companion object {
    private const val REQUEST_MEDIA_PROJECTION = 9912
  }

  private var permissionPromise: Promise? = null

  init {
    reactContext.addActivityEventListener(this)
  }

  override fun getName(): String = "ScreenCaptureModule"

  @ReactMethod
  fun getFilesDir(promise: Promise) {
    promise.resolve(reactContext.filesDir.absolutePath)
  }

  @ReactMethod
  fun requestPermission(promise: Promise) {
    val activity = currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "Current activity is null")
      return
    }

    if (ScreenCaptureService.mediaProjection != null) {
      promise.resolve(true)
      return
    }

    permissionPromise = promise
    try {
      val mpManager = activity.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
      activity.startActivityForResult(mpManager.createScreenCaptureIntent(), REQUEST_MEDIA_PROJECTION)
    } catch (e: Exception) {
      permissionPromise = null
      promise.reject("INTENT_ERROR", "Failed to launch MediaProjection intent: ${e.message}", e)
    }
  }

  @ReactMethod
  fun captureScreenshot(outputPath: String, promise: Promise) {
    val mediaProjection = ScreenCaptureService.mediaProjection
    if (mediaProjection == null) {
      promise.reject("NOT_INITIALIZED", "MediaProjection is not initialized. Call requestPermission first.")
      return
    }

    val metrics = reactContext.resources.displayMetrics
    val width = metrics.widthPixels
    val height = metrics.heightPixels
    val density = metrics.densityDpi

    val targetPath = if (outputPath.isBlank()) {
      File(reactContext.filesDir, "screenshot_${System.currentTimeMillis()}.png").absolutePath
    } else {
      outputPath
    }

    val handlerThread = HandlerThread("ScreenCaptureThread")
    handlerThread.start()
    val handler = Handler(handlerThread.looper)

    val imageReader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2)
    var virtualDisplay: VirtualDisplay? = null

    try {
      virtualDisplay = mediaProjection.createVirtualDisplay(
          "SocialParseCapture",
          width,
          height,
          density,
          DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
          imageReader.surface,
          null,
          handler
      )
    } catch (e: Exception) {
      imageReader.close()
      handlerThread.quitSafely()
      promise.reject("VIRTUAL_DISPLAY_ERROR", "Failed to create VirtualDisplay: ${e.message}", e)
      return
    }

    var handled = false

    handler.postDelayed({
      if (!handled) {
        handled = true
        virtualDisplay.release()
        imageReader.close()
        handlerThread.quitSafely()
        promise.reject("TIMEOUT", "Timed out waiting for frame from VirtualDisplay")
      }
    }, 5000)

    imageReader.setOnImageAvailableListener({ reader ->
      if (handled) return@setOnImageAvailableListener
      val image = reader.acquireLatestImage() ?: return@setOnImageAvailableListener
      handled = true

      try {
        val planes = image.planes
        val buffer = planes[0].buffer
        val pixelStride = planes[0].pixelStride
        val rowStride = planes[0].rowStride
        val rowPadding = rowStride - pixelStride * width

        val bitmap = Bitmap.createBitmap(
            width + rowPadding / pixelStride,
            height,
            Bitmap.Config.ARGB_8888
        )
        bitmap.copyPixelsFromBuffer(buffer)
        image.close()

        val finalBitmap = if (rowPadding > 0) {
          Bitmap.createBitmap(bitmap, 0, 0, width, height)
        } else {
          bitmap
        }

        val destination = File(targetPath)
        destination.parentFile?.mkdirs()
        FileOutputStream(destination).use { out ->
          finalBitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
        }

        virtualDisplay.release()
        imageReader.close()
        handlerThread.quitSafely()

        promise.resolve(destination.absolutePath)
      } catch (e: Exception) {
        virtualDisplay.release()
        imageReader.close()
        handlerThread.quitSafely()
        promise.reject("SAVE_ERROR", "Failed to process screenshot: ${e.message}", e)
      }
    }, handler)
  }

  @ReactMethod
  fun stop(promise: Promise) {
    try {
      ScreenCaptureService.stop(reactContext)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("STOP_ERROR", "Failed to stop service: ${e.message}", e)
    }
  }

  override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode == REQUEST_MEDIA_PROJECTION) {
      if (resultCode == Activity.RESULT_OK && data != null) {
        ScreenCaptureService.start(reactContext, resultCode, data) {
          permissionPromise?.resolve(true)
          permissionPromise = null
        }
      } else {
        permissionPromise?.reject("PERMISSION_DENIED", "MediaProjection permission was denied")
        permissionPromise = null
      }
    }
  }

  override fun onNewIntent(intent: Intent?) {
    // No-op
  }
}
