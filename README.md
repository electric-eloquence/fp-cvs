# CVS (Concurrent Versions System) extension for Fepper

### This package has been DEPRECATED.

This package will no longer receive updates and will eventually be deleted.

### Commands

```shell
fp cvs:co [-d "directory path between $CVSROOT and backend symbolic link"]
fp cvs:st
fp cvs:up
fp cvs:ci -m "commit message"
fp cvs -c "CVS command"
```

### Use

`fp cvs` tasks identify CVS-revisioned files by searching for Fepper frontend 
files with corresponding YAML configs and determining if there exist 
corresponding backend files. To process additional CVS-revisioned files, create 
a directory named `extend/custom/fp-cvs`, and a file within named `cvs.yml`, and 
list them therein. Base it off the empty YAML file in this npm named 
`default.cvs.yml`.
