# 3D Regression Heat Map Front-end

This repository contains all code for the front end necessary to run a `3D Regression Heat Map` instance. The local debugging server can be deployed using `foreman`, which is a `Ruby` gem. The deployment version can be uploaded as a `Heroku` app.

The statistical backend can be found in [this repository](https://github.com/paulklemm/regression-heatmap-r-package).

## How to Start a Local Debugging Server

1. install `foreman` ([https://github.com/ddollar/foreman](https://github.com/ddollar/foreman))
2. navigate to the root folder and launch the local server using `foreman start web`

## Pushing Updates to Heroku

1. be sure to have the correct server listings in `config.json`
2. run `git push heroku master`
3. scale heroku dynos: `heroku ps:scale web=1`

## Data Format

**This repository is licensed under [Attribution-NonCommercial-NoDerivatives 4.0 International](https://creativecommons.org/licenses/by-nc-nd/4.0/)** (see LICENCE.md)

I will change the license to [http://choosealicense.com/licenses/mit/](MIT) as soon as the associated paper gets accepted.
