# 🪴 Fractal Garden 🪴

## 📐 An Exhibition Of Mathematical Beauty 📐 

Fractals are awesome. They look beautiful and have intricate mathematical connections between each other. And they are simply a lot of fun to play around with. 

This project tries to bring cool fractals to more people. Showcasing the artistic beauty as well as the various connections between them. 
Check out the live version at [fractal.garden](fractal.garden)!

## 🔓 Open Source 🔓

The long term plan for this project is to be open source so that people can add more and more beautiful fractals to the mix. I want everybody to "grow" their own little piece of the garden. So that in the end there is a beautiful and detailed overview for the world of fractals - complete with Recursive, WebGL or Lindenmayer implementations for most, if not all, of the fractals out there. 

The Fractal Garden should allow easy exploration, and showcase the connections between the different fractals. It shouldn't be too Mathematics heavy.  Instead it should be rather beautiful and a little whimsical sometimes. There's still a lot of fractals missing and a lot of things to improve. You can have a look at the [issues page]() and see if you can help out. I am very happy to accept PR's.

## 💻 Local Development 💻

This is a [next.js](https://nextjs.org/) project. 

As such it should be relatively easy to setup and use. 
If you haven't installed node.js and npm yet, you should [do that first](https://nodejs.dev/en/learn/how-to-install-nodejs/). 

### 🔌 Installation 🔌

Clone the repo: 

via ssh: 
```bash
git clone git@github.com:trebeljahr/fractal-garden.git
``` 

via https:
```bash
git clone https://github.com/trebeljahr/fractal-garden.git
```

After you have cloned the repo: 

```bash
cd fractal-garden
npm install
npm run dev
```

and tada, you should have a development environment up and running. There are no .env variables to worry about, since this project is generating a completely static page. 

Have a look around at some of the fractals. And enjoy. 😊

## 💪 Contribute 💪

There are two main ways to contribute - improving the existing fractals or adding new ones. 

### ✨ Improving Existing Fractals ✨

Have a look at the current issues of this project -> searching for those tagged with [improve-existing-fractals](https://github.com/trebeljahr/fractal-garden/issues?q=is%3Aissue+is%3Aopen+label%3Aimprove-existing-fractals) should give you an overview of what there is to do. Mostly it's adding better mobile support, speed improvements, and better descriptions. If you want to improve the fractal descriptions you can just edit the .md files – even directly here in the GitHub browser. 

Please feel free to clarify points, add more details, or more connections or to simply fix typos where you see fit!

### 🌿 Adding New Fractals 🌿
If you want to contribute your own fractal, see if there is an issue for it first. You can filter the issues by [new-fractal](https://github.com/trebeljahr/fractal-garden/issues?q=is%3Aissue+is%3Aopen+label%3Anew-fractal). If not, create one following the issue template. 

Make sure to have a <your-fractal>.tsx file, a <your-fractal>.md file as well as a <your-fractal>.jpg file. The picture should just be a screenshot of the rendered fractal canvas - try to pick a beautiful default color for your fractal. 😊

Before submitting a PR ensure that the files are correctly linked to each other. Also, don't forget to add a <FractalLink> component in the /pages/index.tsx file and another link to the array in the /components/Navbar.tsx file.

If you need help with anything, let me know. 

Happy "growing"! 🌱

## 🌌 Plug 🌌

The Fractal Garden originated as one of my [1-month projects](trebeljahr.com/now). I hope to tackle more cool projects like it in the future, the idea is to limit the amount of work that I put into each one of them to exactly 1 month and see/document how far I can get. 
