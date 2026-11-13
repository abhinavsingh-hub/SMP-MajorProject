package com.socialparse.mobile

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper

class ScreenCaptureService : Service() {

  companion object {
    const val ACTION_START = "com.socialparse.mobile.ACTION_START"
    const val ACTION_STOP = "com.socialparse.mobile.ACTION_STOP"
    const val EXTRA_RESULT_CODE = "extra_result_code"
    const val EXTRA_RESULT_DATA = "extra_result_data"

    private const val NOTIFICATION_ID = 4401
    private const val CHANNEL_ID = "screen_capture_channel"

    var mediaProjection: MediaProjection? = null
      private set

    var isRunning = false
      private set

    private var onReadyListener: ((String?) -> Unit)? = null

    fun start(
        context: Context,
        resultCode: Int,
        resultData: Intent,
        onReady: ((String?) -> Unit)? = null
    ) {
      onReadyListener = onReady
      val intent = Intent(context, ScreenCaptureService::class.java).apply {
        action = ACTION_START
        putExtra(EXTRA_RESULT_CODE, resultCode)
        putExtra(EXTRA_RESULT_DATA, resultData)
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    fun stop(context: Context) {
      val intent = Intent(context, ScreenCaptureService::class.java).apply {
        action = ACTION_STOP
      }
      context.startService(intent)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    try {
    when (intent?.action) {
      ACTION_START -> {
        startForegroundWithNotification()

        val resultCode = intent.getIntExtra(EXTRA_RESULT_CODE, 0)
        val resultData = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
          intent.getParcelableExtra(EXTRA_RESULT_DATA, Intent::class.java)
        } else {
          @Suppress("DEPRECATION")
          intent.getParcelableExtra(EXTRA_RESULT_DATA)
        }

        if (resultCode != 0 && resultData != null) {
          val mpManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
          val mp = try {
            mpManager.getMediaProjection(resultCode, resultData)
          } catch (e: Exception) {
            onReadyListener?.invoke("Permission expired, tap to re-grant screen capture permission: ${e.message}")
            onReadyListener = null
            stopForegroundCompat()
            stopSelf(startId)
            return START_NOT_STICKY
          }
          if (mp == null) {
            onReadyListener?.invoke("Permission expired, tap to re-grant screen capture permission.")
            onReadyListener = null
            stopForegroundCompat()
            stopSelf(startId)
            return START_NOT_STICKY
          }
          mp?.registerCallback(object : MediaProjection.Callback() {
            override fun onStop() {
              mediaProjection = null
              isRunning = false
            }
          }, Handler(Looper.getMainLooper()))
          mediaProjection = mp
          isRunning = true
          onReadyListener?.invoke(null)
          onReadyListener = null
        }
      }
      ACTION_STOP -> {
        mediaProjection?.stop()
        mediaProjection = null
        isRunning = false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
          stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
          @Suppress("DEPRECATION")
          stopForeground(true)
        }
        stopSelf()
      }
    }
    } catch (e: Exception) {
      mediaProjection?.let { projection -> try { projection.stop() } catch (_: Exception) { } }
      mediaProjection = null
      isRunning = false
      onReadyListener?.invoke("Permission expired, tap to re-grant screen capture permission: ${e.message}")
      onReadyListener = null
      stopForegroundCompat()
      stopSelf(startId)
    }
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    try { mediaProjection?.stop() } catch (_: Exception) { }
    mediaProjection = null
    isRunning = false
    super.onDestroy()
  }

  private fun startForegroundWithNotification() {
    val notification = createNotification()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
          NOTIFICATION_ID,
          notification,
          ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun stopForegroundCompat() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_REMOVE)
    else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
  }

  private fun createNotification(): Notification {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, CHANNEL_ID)
          .setContentTitle("SocialParse Screen Capture")
          .setContentText("Forensic capture session is active")
          .setSmallIcon(R.mipmap.ic_launcher)
          .setOngoing(true)
          .build()
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(this)
          .setContentTitle("SocialParse Screen Capture")
          .setContentText("Forensic capture session is active")
          .setSmallIcon(R.mipmap.ic_launcher)
          .build()
    }
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
          CHANNEL_ID,
          "Forensic Screen Capture",
          NotificationManager.IMPORTANCE_LOW
      ).apply {
        description = "Active foreground notification for MediaProjection recording"
      }
      val manager = getSystemService(NotificationManager::class.java)
      manager?.createNotificationChannel(channel)
    }
  }
}
