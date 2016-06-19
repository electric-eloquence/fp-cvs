# CVS extension for Fepper

### Commands

```shell
fp cvs:status
fp cvs:up
fp cvs:commit -m "commit message"
fp cvs -c "CVS command"
```

### Use
`fp cvs` tasks identify CVS-revisioned files by searching for Pattern Lab files 
with corresponding YAML configs and determining if there exist corresponding 
backend files. To process additional CVS-revisioned files, create a directory 
named `extend/custom/fp-cvs`, and a file within named `cvs.yml`, and list them 
therein. Base it off the empty YAML file in this NPM named `default.cvs.yml`.
