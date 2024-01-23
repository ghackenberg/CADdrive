To build the docker image:

```sh
docker build --tag "fea-paraview" .
```

To run the docker image:

```sh
docker run -p 127.0.0.1:5000:5000 "fea-paraview"
```

To run without docker (to obtain debut output)

```sh
flask --app main run
```