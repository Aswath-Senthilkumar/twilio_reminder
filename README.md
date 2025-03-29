# Medication Reminder System

A Reminder System using twilio to call or text patients to remind them about their medications.

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Setup & Installation](#3-setup--installation)
4. [Configure Twilio & ngrok](#4-configure-twilio--ngrok)
5. [Configure / Setup MongoDB](#5-configure--setup-mongodb)
6. [Configure STT & TTS](#6-configure-tts--stt)
7. [Running the Platform](#7-running-the-platform)
8. [Trigger a Call](#8-trigger-a-call)
9. [Call Log API](#9-call-log-api)
10. [Review Console Outputs & Patient Interactions](#10-review-console-outputs--patient-interactions)

---

## 1. Overview

The Twilio Reminder System allows you to:

- Initiate outbound calls to patients and detect whether a human or machine answers.
- Play TTS prompts to remind the patients about their medications.
- Capture **full call recordings** through Twilio.
- Stream the call to **Google Cloud Speech-to-Text** for live transcription.
- Store final call data and transcripts in MongoDB.

---

## 2. Prerequisites

1. **Node.js** (latest version) (visit )
2. **npm**
3. **MongoDB** (Atlas)
4. **Twilio** account (trial - only handles calls attended by humans / paid - unlocks voicemail functionality)
5. **Google Cloud** account (could use the free credits on opening a new account)
6. **ngrok** (required if running locally): This tool allows Twilio to tunnel requests to your local machine.

---

## 3. Setup & Installation

1. **Clone** the repository:

   ```bash
   git clone https://github.com/Aswath-Senthilkumar/twilio_reminder.git
   cd twilio-reminder
   ```

2. Install **Dependencies**:

   ```bash
   npm install
   ```

3. Create a `.env` File:

   ```bash
   TWILIO_ACCOUNT_SID =
   TWILIO_AUTH_TOKEN =
   TWILIO_PHONE_NUMBER =
   BASE_URL =
   MONGODB_URI =
   GOOGLE_APPLICATION_CREDENTIALS =
   PORT = 8080
   ```

   We will now be gathering all the required keys / variables.

   1. TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER come from your Twilio Console.
   2. BASE_URL for your publicly accessible URL (ngrok).
   3. MONGODB_URI for Atlas.
   4. GOOGLE_APPLICATION_CREDENTIALS path to your JSON key for Google STT.
   5. PORT for the Express server (8080 by default, you can replace the port number to what you want).

---

## 4. Configure Twilio & ngrok

1. **Twilio**:

   1. Visit [Twilio Login Page](https://login.twilio.com/u/signup) and Login with your credentials.
   2. If you are new to Twilio then create an account, you might need to verify your email and phone number to verify the Caller-Id in order to place calls to that number.
   3. Purchase or get a Twilio trial number.
   4. Once you login, head to the [Twilio Console](https://console.twilio.com/) and scroll to the bottom of the page, where you could find the Twilio Account SID, Twilio Auth Token and your Twilio Phone Number.
   5. Now copy and place them in your `.env` file:

   ```bash
   TWILIO_ACCOUNT_SID = ACxxxxxxxxxxxxxxxxxxxxx (usually starts with AC)
   TWILIO_AUTH_TOKEN = yyyyyyyyyyyyyyyyyyyyyyyyyy (a long alpha-numeric string)
   TWILIO_PHONE_NUMBER = "+11234567890"
   ```

2. **ngrok**:

   1. Visit [ngrok](https://ngrok.com/download) and follow their download instructions for you local system.
   2. Make sure to install, signup and get the auth token and configure ngrok.
   3. Once the configuration is done open a new terminal tab and run the following command: (adjust the port accordingly to your needs)

   ```bash
   ngrok http 8080
   ```

   4. ngrok will start and show you a few details in which you would need the Forwarding (URL) it would look something like:

   ```bash
   https://abc-xyz-123-45.ngrok-free.app
   ```

   copy that URL and place it in your `.env`

   ```bash
   BASE_URL = https://abc-xyz-123-45.ngrok-free.app
   ```

   5. and also head to your [Twilio Console](https://console.twilio.com/) and on the left-panel go to Phone Numbers > Manage > Active Numbers:
      select your Twilio Phone Number and it would enter a Configure tab.
      here, under Voice Configuration > A call comes in:
      in the URL section copy and paste you ngrok URL along with '/incoming' to handle the incoming calls to your Twilio Phone Number.
      something like - `https://abc-xyz-123-45.ngrok-free.app/incoming` and at the end of the page hit the Save Configuration Button.

---

## 5. Configure / Setup MongoDB

1. Go to [MongoDB Atlas](https://www.mongodb.com/products/platform/atlas-database)
2. Login / Create an account and head to your Atlas dashboard.
3. Deploying a **Cluster**:
   1. choose the subscription plan you like (I chose M0 - free).
   2. Name the cluster and click create deployment.
   3. Your local IP will be automatically connected, later if you move then you could head the the Network Access tab on the left-panel and add your new local IP, but if you wish to select "Allow Access From Anywhere", then your IP would be set to '0.0.0.0/0' and could be accessed from anywhere without configuring your new IP.
   4. Enter your desired username and password for creating a database user and click "create a user".
   5. Head to "Choose a connection" and select "Connect to your application > Drivers".
   6. In the next page you'll see a few details where you could find the MONGODB_URI under the 3rd section, it would look something like:
   ```bash
   mongodb+srv://<dbusername>:<dbpassword>@<clustername>.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=<clustername>
   ```
   Copy that and add to your `.env` file:
   ```bash
   MONGODB_URI = mongodb+srv://<dbusername>:<dbpassword>@<clustername>.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=<clustername>
   ```
4. After that, on the left-panel go to Cluster, There you'll find
   "Browse Collections", head there and you'll might some sample databases 'sample_mflix' under the create database button, once we run our application and make calls, we would see our database named "calllogs" under 'test' in that section.

## 6. Configure TTS & STT

1. **TTS**: Done using Twilio's in-built commands / tags, so no extra steps needed.
2. **Google STT**: (I chose Google API )
   1. Go to [Google Cloud](https://cloud.google.com/).
   2. Sign in with you google account, click on get started for free, then you will have to add a Payments Profile and a Payment Method. You will not be charged for up to $300 over the next 90 days.
   3. Once you're done with that, head to the [Google Cloud Console](https://console.cloud.google.com/), make sure you have selected the same google account for which you setup a payment method for.
   4. Create / Select a project and open that.
   5. On the search bar at the top, search for "APIs & Services" and click on it.
   6. You would find a button saying "+ Enable APIs and Services", click on that and search for "Cloud Speech-to-Text API" and click on the first one, or simply follow this link [Cloud Speech-to-Text API](https://console.cloud.google.com/apis/library/speech.googleapis.com), click on Enable, and then Manage.
   7. You would enter the API/Service Details, here on the left panel, click on Credentials and then "+ Create Credentials" > "Service Account".
   8. Name your Service Account, it would generate an Account ID, you could give the account a description as you want and click on create and continue. Optionally grant access to project and access for users to this account.
   9. You will be redirected to the Credentials page where you would find the Service account you created. Click on it.
   10. On the top-panel, click on the "Keys", and then "Add a key" > "Create new key" > "JSON and click on create.
   11. Download and save the JSON file somewhere safe in your local as this file contains the private key and service account email used by your application to authenticate with Google.
   12. Now copy it's actual/full path and save it in `.env` file:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS = /full/path/to/your-service-account-key.json
   ```
   The code for `@google-cloud/speech` automatically reads `process.env.GOOGLE_APPLICATION_CREDENTIALS` to locate the credentials file in your local system.

## 7. Running the Platform

We would need 3 terminal tabs => one to run ngrok - which we have already done, one for starting the server and monitoring logs and one for calling the APIs. Always when opening a new terminal, make sure to enter the project folder by running `cd twilio-reminder/`

**Start the Server**: Open a new terminal tab and run the command

```bash
node index.js
```

it should start the server and log in which port the server is listening to and also notify on successful connection to MongoDB.

head to https://localhost:8080/ and you should see “Twilio Reminder System is running.” if the server has successfully started.

## 8. Trigger a Call

Open a new terminal tab, optionally you can use Postman to call APIs:

**Send a POST to /api/call**: This API requires a content - "to" (to phone number). The number you are trying to place a call needs to be verified in Twilio before you do so in order to connect. and make sure you have the current ngrok Forwarding URL in your API calls, `.env` file and also your Twilio Console Configuration.

now run the command / call the API: (use appropriate command for windows for calling APIs if you're using windows)

```bash
curl -X POST -H "Content-Type: application/json" -d '{"to": "+1<your-verified-caller-id>"}' https://your-ngrok-domain.ngrok-free.app/api/call
```

You would see a json with a message and Call SID on a successful call saying "Call initiated successfully", now head to [step 10](#10-review-console-outputs--patient-interactions).

**Calling your Twilio Phone Number**: You can also just place a call to you Twilio phone number from your verified caller ID, now head to [step 10](#10-review-console-outputs--patient-interactions).

## 9. Call Log API

After performing a few calls, you can now use either Postman or the same terminal you used for placing calls to -

**Send a GET to /call-logs**: This API will fetch all the Call Logs from the MongoDB database and log them in the console.

command: (use appropriate command for windows for calling APIs if you're using windows)

```bash
curl -X GET https://your-ngrok-domain.ngrok-free.app/call-logs
```

you would see the call logs get displayed here too, but you could head to the terminal in which you ran the server for better formatting.

## 10. Review Console Outputs & Patient Interactions

Once you connect a call, check the terminal in which you ran the server:

It would start logging the call details in real-time.

You would see -
`Call initiated with SID: CAxxxxxxxxxxxxxxx`

1. and if a patient attends the call and speaks, it'll detect they are human and start a connection to /media to stream and start transcribing the call -
   `Connected to /media for live transcription.`
   `Call has been connected.`
   `Passing audio stream for Stream SID: xxxxxxxxxxxxxxxxxx`
   upon the patient's response, their live speech will be captured and displayed -
   `Patient: "Hello, xyz..."`
   and once their response has been recorded, the system will hang-up on the call and log the call details -
   `Live captured transcript has been updated to the MongoDB database.`
   `Call has ended.`
   `Call SID: CAxxxxxxxxxxxxxxx, Status: answered`
   `Call SID, Call Status, From, To, Answered By and Call Type has been updated to DB`
   `Recording URL of the call: https://api.twilio.com/xyz...`
   `Recording URL has been updated to the MongoDB database.`

2. if the call goes to the voice-mail box, it would play the voice-mail text and then log -
   `Call SID: CAxxxxxxxxxxxxxxx, Status: voicemail sent`
   `Call SID, Call Status, From, To, Answered By and Call Type has been updated to DB`
   `Recording URL of the call: https://api.twilio.com/xyz...`
   `Recording URL has been updated to the MongoDB database.`

3. if the call was unanswered and didn't go to voice-mail, an SMS will be sent and then log (this functionality has not been tested by myself as Twilio required a toll-free verification with legal company information, you could test this by performing a toll-free verification in twilio) -
   `Call SID: CAxxxxxxxxxxxxxxx, Status: SMS sent`
   `Call SID, Call Status, From, To, Answered By and Call Type has been updated to DB`

## Conclusion

You now have a complete Twilio Reminder System that makes outbound calls, records them, transcribes spoken responses via Google Speech-to-Text, and logs all data in MongoDB. You will need a paid Twilio account to perform all the above mentioned functionalities.
