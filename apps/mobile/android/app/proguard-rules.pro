# Add project specific ProGuard rules here.
-keep class com.socialparse.mobile.** { *; }
-keepclassmembers class * { @com.facebook.react.bridge.ReactMethod <methods>; }
-keep class com.facebook.react.** { *; }
-dontwarn com.facebook.react.**
