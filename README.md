# Cloud Blender Render

### Introduction 
With the rise of AI/LLM boom Jensen's leather jacket is getting shinier with each passing years. What that has resulted into is GPU's getting crazy expensive for regular consumers and especially the 3D artist using blender who heavily rely on Nvidia GPUs. Being a web developer and the user of blender I created this project which allows you to run this docker container on various GPU cloud providers like Runpod, vast.ai, Quickpod, etc to render your `.blend` files with powerful GPU like RTX 4090, RTX 5090 and many more at dirt cheap rates.

This project allows you to access 3000+ USD GPU for under a 1 USD/hour meaning you can render 500-1000 frame with single dollar and that's significantly cheaper than legacy render farms and comes with beautiful GUI to make it feel naturally intuitive for Blender user.

### Video Demo

https://github.com/user-attachments/assets/3409494a-fe44-4ade-a8f9-62f51b690a46

### Requirement
This project will only run on Chrome or Chromium based browsers like Chrome, Edge, Opera, Chromium, Vivaldi, etc. This project utilise [`showDirectoryPicker`](https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker) API which allows user to write files directly on their folder without needing to download a large zip or many files. If you're using Firefox or Safari as your dialy driver and want to use this project, please considering downloading Chrome or any Chromium based browser as Firefox and Safari doesn't properly support this functionality.

<hr>

### How to deploy
**1. Secure and recommended approach**

<a href="https://console.runpod.io/deploy?template=ada1xq99pb&ref=g168bg1u" target="_blank"><img width="200" height="41" alt="Asset 5" src="https://github.com/user-attachments/assets/ffff5850-dbca-492b-8832-0dbe6295bbd7" /></a>

Runpod is GPU cloud provider where you can get all kinds of GPU right from RTX 3070 to RTX 5090 and AI/ML specific GPU. Clicking on the above button will direct you towards Runpod. Once you sign up, this app will be automatically be selected. Select the GPU of your choice either from secure or community cloud and your instance will be ready in 20-30 seconds. Runpod also provides HTTPS connection out of the box i.e. your connection will be encrypted and secure. For more information please watch the above video demo.

**2. Alternatives (non HTTPS and not recommended)**

<table>
  <tr>
    <td>
      <a href="https://cloud.vast.ai/?ref_id=123929&creator_id=123929&name=Cloud%20Blender%20Render" target="_blank">
        <img width="175" alt="Asset 8" src="https://github.com/user-attachments/assets/440cc55a-b692-44f4-b90b-6e91737d6a8a" />
      </a>
    </td>
    <td>
      <a href="https://console.quickpod.io?affiliate=2744798e-b6df-4a2b-a372-5a4ecfa5c0a7" target="_blank">
        <img width="175" alt="Asset 9" src="https://github.com/user-attachments/assets/d2fa04df-d72f-445f-8bf0-38675e82491c" />
      </a>
    </td>
  </tr>
</table>


> [!IMPORTANT]  
>As of today, this application requires the user to have a Chrome or Chromium-based browser and an HTTPS connection. Without that, compatibility simply breaks. Runpod is the only platform, as of now, that provides an HTTPS connection and offers the best user experience amongst all three. There isn't much price difference between all three of these platforms. So, I'd suggest using the alternatives only when you run into any issues with Runpod, which is unlikely to happen from my personal experience.


## Be the top 0.1%

There are an estimated 2–4 million Blender users worldwide, yet less than 0.1% support the Blender Foundation. Open-source projects face similar challenges, many disappear due to a lack of funding. Your support will help keep this project alive and thriving. It will allow me to actively maintain, add new features, and ensure you get the best rendering experience possible.

 <a href="https://coff.ee/rahulahire" target="_blank">
<img width="250" alt="Asset 13" src="https://github.com/user-attachments/assets/a0ded876-af45-4c12-825a-3013f8f7e464" />

 </a>

 
### This project is licensed under Apache 2.0 

Copyright 2025 Rahul Ahire

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

[http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
