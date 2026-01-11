---
active: true
iteration: 1
max_iterations: 100
completion_promise: "DONE"
started_at: "2026-01-11T14:29:29.367Z"
session_id: "ses_45289b58bffeAJgCw1wajkZq5z"
---
our main project is @apps/site/ . we need to create a new app with electron that just wraps this in a webview, remembers last opened page and goes to that page every time the app opens. this came from a retail store owner that we are serving. we only had a website and they said they couldnt find it anywhere. the base url is https://surkhet.app . if we add an electron wrapper and make executables, we can just install it on their systems and they can easily access our system from anywhere. we also need sections to download the app for windows, linux, macos, android, ios and everything (ignore android and ios for now, we have an expo project in apps/surkhet for it). make the electron wrapper under apps/electron. it should support ota updates with github releases and all those bells and whistles as well
