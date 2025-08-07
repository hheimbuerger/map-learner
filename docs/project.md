## Project Map Learner

# Overview / Use Case


# Implementation

## Frontend

The app should open a window displaying a title and short instructions, but most of the window should be dedicated to a large white canvas. Users should be able to draw on this canvas with a screen pen on modern touchscreen laptop devices, or with a mouse. 
There should be a single submit button. Upon submission, the app should send an image of the drawing to a backend server. Although the backend server is not part of this design, after a few seconds, the app should receive some kind of response and evaluation. The design should be as simple as possible, ideally multiplatform.

### Technology

Electron

## Backend

The backend offers a single endpoint, `/evaluate`. It will receive a PNG image of the drawing and evaluate it. An evaluation result is sent back to the frontend in JSON format, containing an `evaluation` key, a text string.

### Technology

Python
Flask
uv for dependency management
