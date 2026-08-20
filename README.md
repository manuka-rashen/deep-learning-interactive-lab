# Neural Lab: Interactive Deep Learning Playground

**Neural Lab** is a polished, browser-based learning application that turns core deep-learning lecture concepts into hands-on experiments. Instead of only reading definitions and equations, learners can generate data, train small models, tune hyperparameters, inspect gradients, convolve images, and observe how memory moves through recurrent networks.

[![HTML](https://img.shields.io/badge/HTML5-semantic-E34F26?logo=html5&logoColor=white)](index.html)
[![CSS](https://img.shields.io/badge/CSS3-responsive-1572B6?logo=css3&logoColor=white)](styles.css)
[![JavaScript](https://img.shields.io/badge/JavaScript-vanilla-F7DF1E?logo=javascript&logoColor=111)](app.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-24d4c4.svg)](LICENSE)

## Why this application exists

Deep learning becomes easier to understand when learners can see cause and effect. Neural Lab connects the complete learning pipeline:

```text
prepare data → define a model → calculate error → update parameters
             → improve generalization → select an architecture
```

Every activity runs locally in the browser. There is no backend, account, framework, build step, or external machine-learning service.

## Interactive laboratories

| Lab | Concepts | What learners can do |
| --- | --- | --- |
| Data Lab | Samples, noise, train/test split, shuffling, standardization | Generate classification, regression, and interleaving-moon datasets and inspect the resulting distributions |
| Fit a Model | Linear model, parameters, MSE, gradient descent | Move slope and bias manually, perform one update, or watch the loss converge |
| Perceptron | Weights, bias, learning rate, decision boundary, linear separability | Train epoch by epoch and compare a separable problem with XOR |
| Activation Explorer | Sigmoid, tanh, ReLU, Leaky ReLU, derivatives | Plot functions and estimate how much gradient remains across network depth |
| Network Builder | Hidden layers, activations, dense connections, parameter counts | Add/remove layers, resize them, and see the architecture and parameter total update live |
| Optimizer Race | SGD, Momentum, RMSProp, Adam, loss landscapes | Place a starting point and compare optimization paths on the same surface |
| Generalization Lab | Underfitting, overfitting, L2, dropout, bias/variance | Change model capacity, data volume, and regularization while comparing train and validation error |
| CNN Lab | Convolution, kernels, padding, stride, ReLU, max pooling | Edit an 8×8 image and generate feature maps with real convolution arithmetic |
| Sequence Lab | Vanilla RNN, LSTM, GRU, hidden state, gated memory | Process text token by token and visualize context retention through time |
| Mastery Check | Integrated understanding | Complete a ten-question quiz with immediate explanations and a saved score |

## Lecture coverage

The application follows the progression of the supplied deep-learning lecture material:

- AI, machine learning, learning, adaptation, and knowledge models
- Supervised, unsupervised, reinforcement, and self-supervised learning
- Artificial neurons, weights, bias, epochs, batches, and iterations
- Single-layer and multilayer perceptrons; forward and backward propagation
- Underfitting, overfitting, early stopping, and model generalization
- Activation functions and vanishing/exploding gradients
- Weight initialization, gradient clipping, normalization, residual paths, and dropout
- SGD, Momentum, RMSProp, Adam, L1/L2 penalties, loss functions, learning rate, and batch size
- Convolutional networks, filters, padding, stride, activation, and pooling
- Recurrent networks, backpropagation through time, LSTM, GRU, and long-range dependencies

## Run locally

No installation is required. You can open `index.html` directly, or serve the folder locally for the most browser-consistent experience:

```bash
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

## Deploy with GitHub Pages

1. Open the repository **Settings**.
2. Select **Pages** under **Code and automation**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and `/ (root)` folder, then save.

The root-level `index.html` makes the repository ready for branch-based GitHub Pages deployment.

## Suggested classroom flow

1. Ask learners to create a noisy dataset and predict how the split will affect evaluation.
2. Let them fit the linear model manually before enabling automatic training.
3. Train the perceptron on separable data, then switch to XOR and discuss the failure.
4. Compare sigmoid and ReLU at 20+ layers in the gradient microscope.
5. Race all four optimizers from the same difficult starting point.
6. Increase complexity with limited data, then recover the fit using more data or regularization.
7. Draw a new shape in the CNN pixel editor and compare kernels, padding, and stride.
8. Lower the sequence retention gate to make early words disappear from context.
9. Finish with the mastery check and revisit any lab linked to a missed concept.

## Project structure

```text
.
├── index.html          # Semantic application structure and learning content
├── styles.css          # Responsive visual system, themes, and component styling
├── app.js              # Simulations, canvas rendering, quiz, and local progress
├── tests/
│   └── smoke-test.mjs  # Dependency-free structural checks
├── package.json        # Convenience test command
├── LICENSE
└── README.md
```

## Accessibility and privacy

- Semantic sections, labels, visible focus indicators, keyboard-friendly controls, and reduced-motion support
- Responsive layouts for desktop, tablet, and mobile screens
- Dark and light themes
- Progress and quiz scores stay in the browser's `localStorage`; no personal data leaves the device

## Development

Run the dependency-free smoke test with:

```bash
npm test
```

The application uses Canvas for visual simulations and plain JavaScript for all numerical updates. It intentionally avoids a framework so students can inspect the complete implementation without a build tool.

## Academic note

Concept coverage was informed by the supplied *Deep Learning* lecture slides by **Prof. Subha Fernando, University of Moratuwa**. This repository contains original explanations, simulations, interface design, and code; the original lecture slides are not redistributed.

## License

Released under the [MIT License](LICENSE). You are welcome to adapt the lab for teaching and learning with attribution.
