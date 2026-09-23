# 🏋️ AI-Powered Fitness & Nutrition App

A cross-platform fitness platform that combines **workout tracking, nutrition logging, progress monitoring, and AI-powered personalization** in one application.

Built with **React, React Native, Expo, TypeScript, Firebase, and OpenAI**, the project includes both web and mobile experiences backed by a shared cloud infrastructure.

> 🚧 **Active Development** — The application is still being developed, with new AI, analytics, and personalization features being added over time.

---

## ✨ Overview

Most fitness apps require users to manually track everything they eat and every workout they complete.

This project explores a more intelligent approach.

The app combines traditional fitness tracking with AI-assisted features that make logging and planning faster and more personalized. Users can track workouts and nutrition, monitor their progress, describe meals naturally, receive meal suggestions, and generate workouts based on their profile and goals.

The long-term goal is to build a fitness platform that doesn't just **store fitness data**, but actually **learns from it and helps users make better decisions**.

---

## 🚀 Features

### 🤖 AI-Powered Tools

* **AI Meal Description**

  * Describe a meal naturally instead of manually entering every ingredient
  * Converts meal descriptions into structured nutrition data
  * Estimates:

    * Calories
    * Protein
    * Carbohydrates
    * Fat
    * Sugar
    * Fiber
  * Users can review and edit the result before saving it

* **AI Meal Suggestions**

  * Generates meal recommendations using the user's goals and nutrition data
  * Considers calorie and macro targets when generating suggestions

* **AI Workout Generation**

  * Generates workout ideas based on user information and fitness goals
  * Designed to make workout planning faster and more personalized

* **Profile-Driven Personalization**

  * User goals and profile information are used throughout the application to create more relevant recommendations

---

## 🍽️ Nutrition Tracking

Track daily nutrition across:

* Breakfast
* Lunch
* Dinner
* Snacks

Users can log food through several different workflows:

* 🔍 Food search
* ⚡ Quick Add
* ✍️ Manual macro entry
* 🤖 AI meal description
* 🕘 Recent foods
* 📷 AI-assisted meal scanning

Nutrition entries can contain:

* Calories
* Protein
* Carbohydrates
* Fat
* Sugar
* Fiber

Daily nutrition summaries make it easy to compare current intake against personal targets.

---

## 🏋️ Workout Tracking

The workout system allows users to record and review training sessions including:

* Exercises
* Sets
* Reps
* Weight
* Training volume
* Workout notes
* Workout history

The application also provides workout summaries and progress data to help users understand their training over time.

---

## 📊 Progress & Activity

The app brings fitness data together into a centralized dashboard.

Users can monitor areas such as:

* Daily calorie intake
* Macronutrients
* Workout activity
* Training volume
* Hydration
* Fitness goals
* Historical progress

Data is synchronized through Firebase so information can remain consistent across the application.

---

## 📱 Web + Mobile

The project is structured as a cross-platform fitness ecosystem rather than a single application.

### Mobile

Built with:

* React Native
* Expo
* Expo Router
* TypeScript
* Firebase
* AsyncStorage

The mobile experience includes dedicated sections for:

**Home · Workouts · Nutrition · Profile**

### Web

Built with:

* React
* Vite
* Tailwind CSS
* Firebase
* React Router

The web dashboard provides another interface for viewing and managing fitness data.

---

## 🧠 How the AI Flow Works

A simplified example of AI-assisted meal logging:

```text
User
  │
  ▼
"Chicken breast with rice and some Greek yogurt"
  │
  ▼
Mobile / Web Client
  │
  ▼
Firebase Authentication
  │
  ▼
Cloud Function / AI Endpoint
  │
  ▼
OpenAI
  │
  ▼
Structured Nutrition Data
  │
  ├── Calories
  ├── Protein
  ├── Carbs
  ├── Fat
  ├── Sugar
  └── Fiber
  │
  ▼
User Reviews / Edits
  │
  ▼
Firestore
```

AI requests are handled server-side rather than exposing model credentials directly in the client.

---

## 🛠️ Tech Stack

| Area                  | Technologies                                |
| --------------------- | ------------------------------------------- |
| Mobile                | React Native, Expo, Expo Router, TypeScript |
| Web                   | React, Vite, Tailwind CSS                   |
| Backend               | Node.js, Firebase Cloud Functions           |
| Database              | Cloud Firestore                             |
| Authentication        | Firebase Authentication                     |
| AI                    | OpenAI API                                  |
| Food Data             | USDA FoodData Central                       |
| Storage / Local State | Firebase, AsyncStorage                      |
| UI                    | Expo Linear Gradient, Blur, Moti, Ionicons  |
| Architecture          | Shared web/mobile packages & cloud backend  |

---

## 🏗️ Architecture

```text
fitness-app/
│
├── fitness-web/          # React web application
│
├── fitness-mobile/       # React Native / Expo application
│
├── functions/            # Firebase Cloud Functions & AI endpoints
│
└── packages/
    └── shared/           # Shared models, utilities & application logic
```

The project uses a shared architecture so that common data structures and application logic can be reused between the web and mobile clients.

---

## 🔥 Firebase Architecture

Firebase provides the core cloud infrastructure for the application.

### Authentication

Firebase Authentication manages user accounts and authenticated sessions.

### Firestore

User-specific collections store information such as:

```text
users/{uid}/
│
├── nutritionEntries/
├── exerciseEntries/
└── ...
```

Firestore listeners allow parts of the application to update in real time as user data changes.

### Cloud Functions

Server-side functions are used for functionality such as:

* AI meal parsing
* AI meal suggestions
* Secure OpenAI API calls
* Request validation
* Caching
* Rate limiting

### Security

Firestore Security Rules restrict access so authenticated users can only access data associated with their own account.

---

## 🎨 UI / UX

The project focuses on creating a modern fitness-app experience rather than a basic CRUD interface.

The interface includes:

* Gradient-based visual design
* Responsive cards and dashboards
* Animated interactions
* Reusable components
* Bottom-sheet workflows
* Quick-add actions
* Editable AI results
* Mobile-first navigation
* Progress visualizations

The goal is to keep detailed fitness tracking powerful without making everyday logging feel complicated.

---

## 🗺️ Roadmap

The project is actively evolving.

Some areas being developed or explored include:

* 🧠 Deeper personalized fitness recommendations
* 📷 Improved AI photo-based meal logging
* 🏋️ More advanced workout generation
* 📈 Long-term progress analytics
* 🍽️ Smarter nutrition recommendations
* 🔗 Better integration between workout and nutrition data
* 📱 Improved web/mobile feature parity
* ⚡ Offline and caching improvements
* 🧪 Expanded automated testing
* 🔔 Notifications and reminders
* 🏆 Gamification and social features

A future goal is to connect the application with a dedicated fitness intelligence engine capable of adapting recommendations based on a user's historical data and progress.

---

## 💡 Why I Built This

Fitness has always been an area I'm interested in, and I wanted to build something more ambitious than a traditional workout tracker.

This project gave me the opportunity to combine several areas of software development I'm interested in:

* Full-stack development
* Mobile development
* Applied AI
* Cloud infrastructure
* Data-driven personalization
* UI/UX
* Fitness analytics

It has also become a testing ground for experimenting with ways AI can make everyday fitness tracking more useful without taking control away from the user.

---

## 🔮 Vision

The long-term vision is to move from:

```text
Fitness Tracker
      ↓
Fitness Assistant
      ↓
Personalized Fitness Intelligence Platform
```

Instead of simply recording what a user has already done, the system should eventually be able to understand patterns in their training, nutrition, goals, and progress and use that information to provide increasingly useful recommendations.

---

## 👨‍💻 Author

**Aristotelis Theocharoulas**

Computer Science graduate interested in **software engineering, applied AI, data, and intelligent applications**.

More projects available on my GitHub profile.

---

⭐ If you find the project interesting, feel free to explore the repository and follow its development.
