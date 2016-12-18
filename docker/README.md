# Node.js in Containers Using Docker

Container technology is one of the best options for software development and deployment. It allows you to share some of the OS resources while encapsulating the code and other concerns. You can think of containers as virtual machines but with less footprint. 

Containers are great for micro services where you replace monoliths with many services. Each of them works in isolation and communicates with other services via a well defined interface (typically REST).

Docker is one of the most popular implementations of containers. Docker's [What is Docker?](https://www.docker.com/what-docker) page has a a neat comparison of containers with VMs. In a nutshell, VMs use hypervisor and each VM has it's own OS while containers share OS and only separate libraries, bin, executables, etc.

This is a simplified diagram on how VMs work (source: docker.com).

![](WhatIsDocker_2_VMs_0-2_2.png)

While with containers, more things are shared. Thus, you get faster startup, execution, spin up, etc.


![](WhatIsDocker_3_Containers_2_0.png)

Node.js is one of the fastest growing platforms. It's great for web applications and API. Especially for microservices. Let's take a look how you can get started with Node and Docker in these steps:

* Installing Docker
* Creating Node images
* Working with multiple containers: Node, MongoDB, Redis, Nginx

# Installing Docker


First of all, you would need to get the Docker deamon. If you are a macOS user like I'm, then the easiest way is to just go to the official Docker website <https://docs.docker.com/docker-for-mac>. 

If you are not a macOS user, then you can select one of the options from this page: <https://docs.docker.com/engine/installation>.


Once install is complete, test your Docker installation by running:


```
$ docker run hello-world
```

Next, we will download a lightweight version of Linux as an image. It's called Alpine. We will get this Alpine image from Docker Hub.

```
$ docker pull alpine
```

Wait for the image to download. I hope you have a fast internet speed. The good thing is that you need to download image just once. It will be stored on your computer for future usage. Let's actually go ahead and check that the image is there by running:

```
$ docker images
```

# Creating Node images

# Working with multiple containers: Node, MongoDB, Redis, Nginx



